use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::infrastructure::storage::{SQLiteStorage, StorageError};

#[derive(Debug, Deserialize)]
pub struct ArchiveImportedDocumentRequest {
    pub document_id: Uuid,
}

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct ArchiveImportedDocumentResponse {
    pub document_id: Uuid,
}

pub fn archive_imported_document_with_storage(
    request: ArchiveImportedDocumentRequest,
    storage: &SQLiteStorage,
) -> Result<ArchiveImportedDocumentResponse, String> {
    storage
        .archive_document(request.document_id)
        .map_err(format_storage_error)?;

    Ok(ArchiveImportedDocumentResponse {
        document_id: request.document_id,
    })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn archive_imported_document(
    app_handle: tauri::AppHandle,
    request: ArchiveImportedDocumentRequest,
) -> Result<ArchiveImportedDocumentResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    archive_imported_document_with_storage(request, &storage)
}

fn format_storage_error(_error: StorageError) -> String {
    "Nao foi possivel arquivar o documento.".to_owned()
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{archive_imported_document_with_storage, ArchiveImportedDocumentRequest};
    use crate::{
        domain::{Document, DocumentSourceType, Language},
        infrastructure::storage::SQLiteStorage,
    };

    #[test]
    fn archives_imported_document() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document = Document::new(
            Uuid::new_v4(),
            "Documento para arquivar",
            Language::Pt,
            DocumentSourceType::Pdf,
            "/tmp/documento.pdf",
        )
        .unwrap();
        storage.save_document(&document).unwrap();

        let response = archive_imported_document_with_storage(
            ArchiveImportedDocumentRequest {
                document_id: document.id,
            },
            &storage,
        )
        .unwrap();

        assert_eq!(response.document_id, document.id);
        assert!(storage.list_documents().unwrap().is_empty());
    }
}
