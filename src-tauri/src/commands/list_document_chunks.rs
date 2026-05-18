use serde::Serialize;
use uuid::Uuid;

use crate::{
    domain::DocumentChunk,
    infrastructure::storage::{SQLiteStorage, StorageError},
};

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct ListDocumentChunksResponse {
    pub chunks: Vec<DocumentChunk>,
}

pub fn list_document_chunks_from_storage(
    storage: &SQLiteStorage,
    document_id: Uuid,
) -> Result<ListDocumentChunksResponse, String> {
    storage
        .list_chunks_by_document(document_id)
        .map(|chunks| ListDocumentChunksResponse { chunks })
        .map_err(format_storage_error)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn list_document_chunks(
    app_handle: tauri::AppHandle,
    document_id: Uuid,
) -> Result<ListDocumentChunksResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    list_document_chunks_from_storage(&storage, document_id)
}

fn format_storage_error(error: StorageError) -> String {
    match error {
        StorageError::OpenFailed(_)
        | StorageError::MigrationFailed(_)
        | StorageError::SaveDocumentFailed(_)
        | StorageError::ListDocumentsFailed(_)
        | StorageError::SaveChunksFailed(_)
        | StorageError::ListChunksFailed(_)
        | StorageError::InvalidDocumentId(_)
        | StorageError::InvalidBookId(_)
        | StorageError::InvalidChunkId(_)
        | StorageError::InvalidChunkDocumentId(_)
        | StorageError::InvalidChunkPosition(_)
        | StorageError::InvalidChunkTokenEstimate(_)
        | StorageError::InvalidLanguage(_) => {
            "Nao foi possivel acessar os chunks do documento.".to_owned()
        }
    }
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::list_document_chunks_from_storage;
    use crate::{domain::DocumentChunk, infrastructure::storage::SQLiteStorage};

    #[test]
    fn lists_persisted_chunks_for_document() {
        let mut storage = SQLiteStorage::open_in_memory().unwrap();
        let book_id = Uuid::new_v4();
        let document_id = Uuid::new_v4();
        let chunk = DocumentChunk::new(book_id, document_id, 1, "chunk salvo").unwrap();
        storage.save_chunks(&[chunk.clone()]).unwrap();

        let response = list_document_chunks_from_storage(&storage, document_id).unwrap();

        assert_eq!(response.chunks, vec![chunk]);
    }
}
