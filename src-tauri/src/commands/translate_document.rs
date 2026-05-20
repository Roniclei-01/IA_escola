use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    app::{
        translate_document as translate_document_content, ModelAdapterTranslationProvider,
        TranslateDocumentError, TranslationProvider, TranslationProviderError,
    },
    domain::Language,
    infrastructure::storage::{SQLiteStorage, StorageError},
};

#[cfg(feature = "tauri-app")]
const DEFAULT_LIBRETRANSLATE_BASE_URL: &str = "http://127.0.0.1:5000";

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct TranslateDocumentRequest {
    pub document_id: String,
    pub content: String,
    pub source_language: Language,
    pub target_language: Language,
    pub persist: Option<bool>,
    pub page_index: Option<u32>,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct TranslateDocumentResponse {
    pub document_id: String,
    pub source_language: Language,
    pub target_language: Language,
    pub translated_content: String,
    pub page_index: Option<u32>,
}

pub fn translate_document_with_provider(
    request: TranslateDocumentRequest,
    provider: &dyn TranslationProvider,
) -> Result<TranslateDocumentResponse, String> {
    let document_id = request.document_id.trim();

    if document_id.is_empty() {
        return Err("Documento invalido para traducao.".to_owned());
    }

    let translated_content = translate_document_content(
        &request.content,
        request.source_language.clone(),
        request.target_language.clone(),
        provider,
    )
    .map_err(format_translation_error)?;

    Ok(TranslateDocumentResponse {
        document_id: document_id.to_owned(),
        source_language: request.source_language,
        target_language: request.target_language,
        translated_content,
        page_index: request.page_index,
    })
}

pub fn translate_document_with_adapter(
    request: TranslateDocumentRequest,
    adapter: &dyn crate::app::ModelAdapter,
) -> Result<TranslateDocumentResponse, String> {
    let provider = ModelAdapterTranslationProvider::new(adapter);

    translate_document_with_provider(request, &provider)
}

pub fn translate_document_with_provider_and_storage(
    request: TranslateDocumentRequest,
    provider: &dyn TranslationProvider,
    storage: &SQLiteStorage,
) -> Result<TranslateDocumentResponse, String> {
    let should_persist = request.persist.unwrap_or(true);
    let response = translate_document_with_provider(request, provider)?;
    let document_id = Uuid::parse_str(&response.document_id)
        .map_err(|_| "Documento invalido para traducao.".to_owned())?;

    if should_persist {
        if let Some(page_index) = response.page_index {
            storage
                .save_document_page_translation(
                    document_id,
                    &response.source_language,
                    &response.target_language,
                    page_index,
                    &response.translated_content,
                )
                .map_err(format_storage_error)?;
        } else {
            storage
                .save_document_translation(
                    document_id,
                    &response.source_language,
                    &response.target_language,
                    &response.translated_content,
                )
                .map_err(format_storage_error)?;
        }
    }

    Ok(response)
}

pub fn translate_document_with_adapter_and_storage(
    request: TranslateDocumentRequest,
    adapter: &dyn crate::app::ModelAdapter,
    storage: &SQLiteStorage,
) -> Result<TranslateDocumentResponse, String> {
    let provider = ModelAdapterTranslationProvider::new(adapter);

    translate_document_with_provider_and_storage(request, &provider, storage)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub async fn translate_document(
    app_handle: tauri::AppHandle,
    request: TranslateDocumentRequest,
) -> Result<TranslateDocumentResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        use crate::infrastructure::ai::{OllamaHttpClient, OllamaModelAdapter, OllamaModelConfig};
        use crate::infrastructure::translation::{
            LibreTranslateHttpClient, LibreTranslateProvider,
        };

        let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;
        let settings =
            crate::commands::ollama_settings::load_ollama_settings_from_storage(&storage)?;
        let libretranslate_provider = LibreTranslateProvider::new(LibreTranslateHttpClient::new(
            DEFAULT_LIBRETRANSLATE_BASE_URL,
        ));
        let adapter = OllamaModelAdapter::new(
            OllamaHttpClient::new(settings.base_url),
            OllamaModelConfig {
                model: settings.model,
            },
        );
        let ollama_provider = ModelAdapterTranslationProvider::new(&adapter);
        let provider = crate::app::FallbackTranslationProvider::new(
            &libretranslate_provider,
            &ollama_provider,
        );

        translate_document_with_provider_and_storage(request, &provider, &storage)
    })
    .await
    .map_err(|_| "Nao foi possivel concluir a traducao do documento.".to_owned())?
}

fn format_translation_error(error: TranslateDocumentError) -> String {
    match error {
        TranslateDocumentError::EmptyContent => "Nao ha conteudo para traduzir.".to_owned(),
        TranslateDocumentError::EmptyTranslation => {
            "O servico de traducao nao retornou texto traduzido. Tente novamente ou use outro provedor.".to_owned()
        }
        TranslateDocumentError::Provider(TranslationProviderError::Unavailable) => {
            "Nao foi possivel traduzir. Verifique se o LibreTranslate esta aberto ou se o Ollama fallback esta configurado.".to_owned()
        }
        TranslateDocumentError::Provider(TranslationProviderError::InvalidResponse(_)) => {
            "O servico de traducao respondeu em um formato invalido.".to_owned()
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
            persist: None,
            page_index: None,
        }
    }

    #[test]
    fn translates_document_with_adapter() {
        let response =
            translate_document_with_adapter(request(), &FakeModelAdapter { fail: false }).unwrap();

        assert_eq!(response.document_id, "00000000-0000-0000-0000-000000000001");
        assert_eq!(response.source_language, Language::Pt);
        assert_eq!(response.target_language, Language::En);
        assert_eq!(response.page_index, None);
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
    fn formats_translation_provider_failure_for_ui() {
        let result = translate_document_with_adapter(request(), &FakeModelAdapter { fail: true });

        assert_eq!(
            result.unwrap_err(),
            "Nao foi possivel traduzir. Verifique se o LibreTranslate esta aberto ou se o Ollama fallback esta configurado."
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

    #[test]
    fn skips_persistence_when_translation_request_is_page_scoped() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let mut request = request();
        request.persist = Some(false);
        request.page_index = Some(0);

        let response = super::translate_document_with_adapter_and_storage(
            request,
            &FakeModelAdapter { fail: false },
            &storage,
        )
        .unwrap();

        let persisted = storage
            .load_document_translation(response.document_id.parse().unwrap(), &Language::En)
            .unwrap();

        assert!(persisted.is_none());
    }

    #[test]
    fn saves_page_scoped_translation_when_storage_is_provided() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let mut request = request();
        request.page_index = Some(2);

        let response = super::translate_document_with_adapter_and_storage(
            request,
            &FakeModelAdapter { fail: false },
            &storage,
        )
        .unwrap();

        let persisted = storage
            .load_document_page_translation(response.document_id.parse().unwrap(), &Language::En, 2)
            .unwrap()
            .unwrap();

        assert_eq!(response.page_index, Some(2));
        assert_eq!(persisted.translated_content, response.translated_content);
        assert!(storage
            .load_document_translation(response.document_id.parse().unwrap(), &Language::En)
            .unwrap()
            .is_none());
    }
}
