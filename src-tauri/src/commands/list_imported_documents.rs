use serde::Serialize;

use crate::{
    commands::ImportTextBookResponse,
    infrastructure::storage::{SQLiteStorage, StorageError},
};

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct ListImportedDocumentsResponse {
    pub documents: Vec<ImportTextBookResponse>,
}

pub fn list_imported_documents_from_storage(
    storage: &SQLiteStorage,
) -> Result<ListImportedDocumentsResponse, String> {
    storage
        .list_documents()
        .map(|documents| ListImportedDocumentsResponse {
            documents: documents
                .into_iter()
                .map(ImportTextBookResponse::from)
                .collect(),
        })
        .map_err(format_storage_error)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn list_imported_documents(
    app_handle: tauri::AppHandle,
) -> Result<ListImportedDocumentsResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    list_imported_documents_from_storage(&storage)
}

fn format_storage_error(error: StorageError) -> String {
    match error {
        StorageError::OpenFailed(_)
        | StorageError::MigrationFailed(_)
        | StorageError::SaveDocumentFailed(_)
        | StorageError::ListDocumentsFailed(_)
        | StorageError::InvalidDocumentId(_)
        | StorageError::InvalidBookId(_)
        | StorageError::InvalidLanguage(_) => {
            "Nao foi possivel acessar os documentos salvos.".to_owned()
        }
    }
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::list_imported_documents_from_storage;
    use crate::{
        domain::{Document, Language},
        infrastructure::storage::SQLiteStorage,
    };

    #[test]
    fn lists_persisted_documents() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document = Document::new(Uuid::new_v4(), "Documento salvo", Language::Pt).unwrap();
        storage.save_document(&document).unwrap();

        let response = list_imported_documents_from_storage(&storage).unwrap();

        assert_eq!(response.documents.len(), 1);
        assert_eq!(response.documents[0].document_id, document.id);
        assert_eq!(response.documents[0].content, "Documento salvo");
    }
}
