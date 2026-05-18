use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::infrastructure::storage::{SQLiteStorage, StorageError};

#[derive(Debug, Deserialize)]
pub struct DeleteImportedDocumentRequest {
    pub document_id: Uuid,
}

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct DeleteImportedDocumentResponse {
    pub document_id: Uuid,
}

pub fn delete_imported_document_with_storage(
    request: DeleteImportedDocumentRequest,
    storage: &mut SQLiteStorage,
) -> Result<DeleteImportedDocumentResponse, String> {
    storage
        .delete_archived_document(request.document_id)
        .map_err(format_storage_error)?;

    Ok(DeleteImportedDocumentResponse {
        document_id: request.document_id,
    })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn delete_imported_document(
    app_handle: tauri::AppHandle,
    request: DeleteImportedDocumentRequest,
) -> Result<DeleteImportedDocumentResponse, String> {
    let mut storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    delete_imported_document_with_storage(request, &mut storage)
}

fn format_storage_error(_error: StorageError) -> String {
    "Nao foi possivel excluir o documento.".to_owned()
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{delete_imported_document_with_storage, DeleteImportedDocumentRequest};
    use crate::{
        domain::{Document, DocumentSourceType, Language},
        infrastructure::storage::SQLiteStorage,
    };

    #[test]
    fn deletes_imported_document() {
        let mut storage = SQLiteStorage::open_in_memory().unwrap();
        let document = Document::new(
            Uuid::new_v4(),
            "Documento para excluir",
            Language::Pt,
            DocumentSourceType::Pdf,
            "/tmp/documento.pdf",
        )
        .unwrap();
        storage.save_document(&document).unwrap();
        storage.archive_document(document.id).unwrap();

        let response = delete_imported_document_with_storage(
            DeleteImportedDocumentRequest {
                document_id: document.id,
            },
            &mut storage,
        )
        .unwrap();

        assert_eq!(response.document_id, document.id);
        assert!(storage.list_archived_documents().unwrap().is_empty());
    }
}
