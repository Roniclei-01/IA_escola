use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{domain::Language, infrastructure::storage::SQLiteStorage};

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct ListDocumentPageTranslationsRequest {
    pub document_id: Uuid,
    pub target_language: Language,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct ListDocumentPageTranslationsResponse {
    pub page_indexes: Vec<u32>,
}

pub fn list_document_page_translations_from_storage(
    storage: &SQLiteStorage,
    request: ListDocumentPageTranslationsRequest,
) -> Result<ListDocumentPageTranslationsResponse, String> {
    let page_indexes = storage
        .list_document_page_translation_indexes(request.document_id, &request.target_language)
        .map_err(|_| "Nao foi possivel listar as paginas traduzidas.".to_owned())?;

    Ok(ListDocumentPageTranslationsResponse { page_indexes })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn list_document_page_translations(
    app_handle: tauri::AppHandle,
    request: ListDocumentPageTranslationsRequest,
) -> Result<ListDocumentPageTranslationsResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    list_document_page_translations_from_storage(&storage, request)
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{
        list_document_page_translations_from_storage, ListDocumentPageTranslationsRequest,
    };
    use crate::{domain::Language, infrastructure::storage::SQLiteStorage};

    #[test]
    fn lists_persisted_document_page_translation_indexes() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        storage
            .save_document_page_translation(
                document_id,
                &Language::Pt,
                &Language::En,
                1,
                "Second page.",
            )
            .unwrap();
        storage
            .save_document_page_translation(
                document_id,
                &Language::Pt,
                &Language::En,
                0,
                "First page.",
            )
            .unwrap();

        let response = list_document_page_translations_from_storage(
            &storage,
            ListDocumentPageTranslationsRequest {
                document_id,
                target_language: Language::En,
            },
        )
        .unwrap();

        assert_eq!(response.page_indexes, vec![0, 1]);
    }
}
