use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    domain::Language,
    infrastructure::storage::{DocumentTranslationRecord, SQLiteStorage, StorageError},
};

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct LoadDocumentTranslationRequest {
    pub document_id: Uuid,
    pub target_language: Language,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct LoadDocumentTranslationResponse {
    pub translation: Option<DocumentTranslationRecord>,
}

pub fn load_document_translation_from_storage(
    storage: &SQLiteStorage,
    request: LoadDocumentTranslationRequest,
) -> Result<LoadDocumentTranslationResponse, String> {
    storage
        .load_document_translation(request.document_id, &request.target_language)
        .map(|translation| LoadDocumentTranslationResponse { translation })
        .map_err(format_storage_error)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn load_document_translation(
    app_handle: tauri::AppHandle,
    request: LoadDocumentTranslationRequest,
) -> Result<LoadDocumentTranslationResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    load_document_translation_from_storage(&storage, request)
}

fn format_storage_error(_error: StorageError) -> String {
    "Nao foi possivel carregar a traducao salva.".to_owned()
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{load_document_translation_from_storage, LoadDocumentTranslationRequest};
    use crate::{domain::Language, infrastructure::storage::SQLiteStorage};

    #[test]
    fn loads_persisted_document_translation() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();
        storage
            .save_document_translation(
                document_id,
                &Language::Pt,
                &Language::En,
                "Saved translation.",
            )
            .unwrap();

        let response = load_document_translation_from_storage(
            &storage,
            LoadDocumentTranslationRequest {
                document_id,
                target_language: Language::En,
            },
        )
        .unwrap();

        assert_eq!(
            response.translation.unwrap().translated_content,
            "Saved translation."
        );
    }

    #[test]
    fn returns_none_when_translation_is_missing() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let response = load_document_translation_from_storage(
            &storage,
            LoadDocumentTranslationRequest {
                document_id: Uuid::new_v4(),
                target_language: Language::En,
            },
        )
        .unwrap();

        assert_eq!(response.translation, None);
    }
}
