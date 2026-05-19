use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    app::{
        translate_document as translate_document_content, ModelAdapterError, TranslateDocumentError,
    },
    domain::Language,
    infrastructure::storage::{SQLiteStorage, StorageError},
};

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct TranslateDocumentRequest {
    pub document_id: String,
    pub content: String,
    pub source_language: Language,
    pub target_language: Language,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct TranslateDocumentResponse {
    pub document_id: String,
    pub source_language: Language,
    pub target_language: Language,
    pub translated_content: String,
}

pub fn translate_document_with_adapter(
    request: TranslateDocumentRequest,
    adapter: &dyn crate::app::ModelAdapter,
) -> Result<TranslateDocumentResponse, String> {
    let document_id = request.document_id.trim();

    if document_id.is_empty() {
        return Err("Documento invalido para traducao.".to_owned());
    }

    let translated_content = translate_document_content(
        &request.content,
        request.source_language.clone(),
        request.target_language.clone(),
        adapter,
    )
    .map_err(format_translation_error)?;

    Ok(TranslateDocumentResponse {
        document_id: document_id.to_owned(),
        source_language: request.source_language,
        target_language: request.target_language,
        translated_content,
    })
}

pub fn translate_document_with_adapter_and_storage(
    request: TranslateDocumentRequest,
    adapter: &dyn crate::app::ModelAdapter,
    storage: &SQLiteStorage,
) -> Result<TranslateDocumentResponse, String> {
    let response = translate_document_with_adapter(request, adapter)?;
    let document_id = Uuid::parse_str(&response.document_id)
        .map_err(|_| "Documento invalido para traducao.".to_owned())?;

    storage
        .save_document_translation(
            document_id,
            &response.source_language,
            &response.target_language,
            &response.translated_content,
        )
        .map_err(format_storage_error)?;

    Ok(response)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub async fn translate_document(
    app_handle: tauri::AppHandle,
    request: TranslateDocumentRequest,
) -> Result<TranslateDocumentResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        use crate::infrastructure::ai::{OllamaHttpClient, OllamaModelAdapter, OllamaModelConfig};

        let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;
        let settings =
            crate::commands::ollama_settings::load_ollama_settings_from_storage(&storage)?;
        let adapter = OllamaModelAdapter::new(
            OllamaHttpClient::new(settings.base_url),
            OllamaModelConfig {
                model: settings.model,
            },
        );

        translate_document_with_adapter_and_storage(request, &adapter, &storage)
    })
    .await
    .map_err(|_| "Nao foi possivel concluir a traducao do documento.".to_owned())?
}

fn format_translation_error(error: TranslateDocumentError) -> String {
    match error {
        TranslateDocumentError::EmptyContent => "Nao ha conteudo para traduzir.".to_owned(),
        TranslateDocumentError::Model(ModelAdapterError::Unavailable) => {
            "Nao foi possivel traduzir com o Ollama. Verifique a conexao e o modelo configurado."
                .to_owned()
        }
        TranslateDocumentError::Model(ModelAdapterError::InvalidFlashcards(_)) => {
            "O Ollama respondeu em um formato invalido para traducao.".to_owned()
        }
    }
}

fn format_storage_error(_error: StorageError) -> String {
    "Nao foi possivel salvar a traducao do documento.".to_owned()
}

#[cfg(test)]
mod tests {
    use super::{translate_document_with_adapter, TranslateDocumentRequest};
    use crate::{
        app::{FlashcardConfig, ModelAdapter, ModelAdapterError},
        domain::{DocumentChunk, Language, StudyCard},
        infrastructure::storage::SQLiteStorage,
    };

    struct FakeModelAdapter {
        fail: bool,
    }

    impl ModelAdapter for FakeModelAdapter {
        fn generate_text(&self, prompt: &str) -> Result<String, ModelAdapterError> {
            if self.fail {
                return Err(ModelAdapterError::Unavailable);
            }

            Ok(format!("Translated: {prompt}"))
        }

        fn create_flashcards(
            &self,
            _chunks: &[DocumentChunk],
            _config: &FlashcardConfig,
        ) -> Result<Vec<StudyCard>, ModelAdapterError> {
            Ok(Vec::new())
        }
    }

    fn request() -> TranslateDocumentRequest {
        TranslateDocumentRequest {
            document_id: "00000000-0000-0000-0000-000000000001".to_owned(),
            content: "Conteudo para traduzir.".to_owned(),
            source_language: Language::Pt,
            target_language: Language::En,
        }
    }

    #[test]
    fn translates_document_with_adapter() {
        let response =
            translate_document_with_adapter(request(), &FakeModelAdapter { fail: false }).unwrap();

        assert_eq!(response.document_id, "00000000-0000-0000-0000-000000000001");
        assert_eq!(response.source_language, Language::Pt);
        assert_eq!(response.target_language, Language::En);
        assert!(response.translated_content.contains("Translated:"));
    }

    #[test]
    fn rejects_empty_document_id() {
        let mut request = request();
        request.document_id = " ".to_owned();

        let result = translate_document_with_adapter(request, &FakeModelAdapter { fail: false });

        assert_eq!(result.unwrap_err(), "Documento invalido para traducao.");
    }

    #[test]
    fn formats_ollama_failure_for_ui() {
        let result = translate_document_with_adapter(request(), &FakeModelAdapter { fail: true });

        assert_eq!(
            result.unwrap_err(),
            "Nao foi possivel traduzir com o Ollama. Verifique a conexao e o modelo configurado."
        );
    }

    #[test]
    fn saves_generated_translation_when_storage_is_provided() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let response = super::translate_document_with_adapter_and_storage(
            request(),
            &FakeModelAdapter { fail: false },
            &storage,
        )
        .unwrap();

        let persisted = storage
            .load_document_translation(response.document_id.parse().unwrap(), &Language::En)
            .unwrap()
            .unwrap();

        assert_eq!(persisted.translated_content, response.translated_content);
    }
}
