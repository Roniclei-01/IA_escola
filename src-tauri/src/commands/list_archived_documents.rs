use serde::Serialize;

use crate::{
    commands::ImportTextBookResponse,
    infrastructure::storage::{SQLiteStorage, StorageError},
};

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct ListArchivedDocumentsResponse {
    pub documents: Vec<ImportTextBookResponse>,
}

pub fn list_archived_documents_from_storage(
    storage: &SQLiteStorage,
) -> Result<ListArchivedDocumentsResponse, String> {
    storage
        .list_archived_documents()
        .map(|documents| ListArchivedDocumentsResponse {
            documents: documents
                .into_iter()
                .map(ImportTextBookResponse::from)
                .collect(),
        })
        .map_err(format_storage_error)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn list_archived_documents(
    app_handle: tauri::AppHandle,
) -> Result<ListArchivedDocumentsResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    list_archived_documents_from_storage(&storage)
}

fn format_storage_error(_error: StorageError) -> String {
    "Nao foi possivel acessar os documentos arquivados.".to_owned()
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::list_archived_documents_from_storage;
    use crate::{
        domain::{Document, DocumentSourceType, Language},
        infrastructure::storage::SQLiteStorage,
    };

    #[test]
    fn lists_archived_documents() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document = Document::new(
            Uuid::new_v4(),
            "Documento arquivado",
            Language::Pt,
            DocumentSourceType::Txt,
            "/tmp/arquivado.txt",
        )
        .unwrap();

        storage.save_document(&document).unwrap();
        storage.archive_document(document.id).unwrap();

        let response = list_archived_documents_from_storage(&storage).unwrap();

        assert_eq!(response.documents.len(), 1);
        assert_eq!(response.documents[0].document_id, document.id);
        assert_eq!(response.documents[0].content, "Documento arquivado");
    }
}
