use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::infrastructure::storage::{SQLiteStorage, StorageError};

#[derive(Debug, Deserialize)]
pub struct RestoreImportedDocumentRequest {
    pub document_id: Uuid,
}

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct RestoreImportedDocumentResponse {
    pub document_id: Uuid,
}

pub fn restore_imported_document_with_storage(
    request: RestoreImportedDocumentRequest,
    storage: &SQLiteStorage,
) -> Result<RestoreImportedDocumentResponse, String> {
    storage
        .restore_document(request.document_id)
        .map_err(format_storage_error)?;

    Ok(RestoreImportedDocumentResponse {
        document_id: request.document_id,
    })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn restore_imported_document(
    app_handle: tauri::AppHandle,
    request: RestoreImportedDocumentRequest,
) -> Result<RestoreImportedDocumentResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    restore_imported_document_with_storage(request, &storage)
}

fn format_storage_error(_error: StorageError) -> String {
    "Nao foi possivel restaurar o documento.".to_owned()
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{restore_imported_document_with_storage, RestoreImportedDocumentRequest};
    use crate::{
        domain::{Document, DocumentSourceType, Language},
        infrastructure::storage::SQLiteStorage,
    };

    #[test]
    fn restores_imported_document() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document = Document::new(
            Uuid::new_v4(),
            "Documento para restaurar",
            Language::Pt,
            DocumentSourceType::Pdf,
            "/tmp/documento.pdf",
        )
        .unwrap();
        storage.save_document(&document).unwrap();
        storage.archive_document(document.id).unwrap();

        let response = restore_imported_document_with_storage(
            RestoreImportedDocumentRequest {
                document_id: document.id,
            },
            &storage,
        )
        .unwrap();

        assert_eq!(response.document_id, document.id);
        assert_eq!(storage.list_documents().unwrap(), vec![document]);
    }
}
