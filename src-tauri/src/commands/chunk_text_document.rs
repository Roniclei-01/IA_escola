use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    app::{chunk_document, ChunkDocumentConfig, ChunkDocumentError},
    domain::{Document, DocumentChunk, Language},
    infrastructure::storage::{SQLiteStorage, StorageError},
};

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct ChunkTextDocumentRequest {
    pub document_id: Uuid,
    pub book_id: Uuid,
    pub content: String,
    pub language: Language,
    pub max_words_per_chunk: usize,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct ChunkTextDocumentResponse {
    pub chunks: Vec<DocumentChunk>,
}

pub fn chunk_text_document_from_request(
    request: ChunkTextDocumentRequest,
) -> Result<ChunkTextDocumentResponse, String> {
    chunk_text_document_response(request)
}

pub fn chunk_text_document_with_storage(
    request: ChunkTextDocumentRequest,
    storage: &mut SQLiteStorage,
) -> Result<ChunkTextDocumentResponse, String> {
    let response = chunk_text_document_response(request)?;
    storage
        .save_chunks(&response.chunks)
        .map_err(format_storage_error)?;

    Ok(response)
}

fn chunk_text_document_response(
    request: ChunkTextDocumentRequest,
) -> Result<ChunkTextDocumentResponse, String> {
    let document = Document {
        id: request.document_id,
        book_id: request.book_id,
        content: request.content,
        language: request.language,
    };

    chunk_document(
        &document,
        ChunkDocumentConfig {
            max_words_per_chunk: request.max_words_per_chunk,
        },
    )
    .map(|chunks| ChunkTextDocumentResponse { chunks })
    .map_err(format_chunk_error)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn chunk_text_document(
    app_handle: tauri::AppHandle,
    request: ChunkTextDocumentRequest,
) -> Result<ChunkTextDocumentResponse, String> {
    let mut storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    chunk_text_document_with_storage(request, &mut storage)
}

fn format_chunk_error(error: ChunkDocumentError) -> String {
    match error {
        ChunkDocumentError::InvalidChunkSize => {
            "O tamanho do chunk deve ser maior que zero.".to_owned()
        }
        ChunkDocumentError::InvalidChunk(_) => {
            "Nao foi possivel criar chunks para o documento.".to_owned()
        }
    }
}

fn format_storage_error(_error: StorageError) -> String {
    "Nao foi possivel salvar os chunks do documento.".to_owned()
}

#[cfg(test)]
mod tests {
    use super::{
        chunk_text_document_from_request, chunk_text_document_with_storage,
        ChunkTextDocumentRequest,
    };
    use crate::{domain::Language, infrastructure::storage::SQLiteStorage};
    use uuid::Uuid;

    #[test]
    fn chunks_imported_text_document() {
        let request = ChunkTextDocumentRequest {
            document_id: Uuid::new_v4(),
            book_id: Uuid::new_v4(),
            content: "um dois tres quatro cinco".to_owned(),
            language: Language::Pt,
            max_words_per_chunk: 2,
        };

        let response = chunk_text_document_from_request(request).unwrap();

        assert_eq!(response.chunks.len(), 3);
        assert_eq!(response.chunks[0].content, "um dois");
        assert_eq!(response.chunks[1].content, "tres quatro");
        assert_eq!(response.chunks[2].content, "cinco");
    }

    #[test]
    fn chunks_and_persists_imported_text_document() {
        let mut storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();
        let request = ChunkTextDocumentRequest {
            document_id,
            book_id: Uuid::new_v4(),
            content: "um dois tres quatro cinco".to_owned(),
            language: Language::Pt,
            max_words_per_chunk: 2,
        };

        let response = chunk_text_document_with_storage(request, &mut storage).unwrap();
        let chunks = storage.list_chunks_by_document(document_id).unwrap();

        assert_eq!(chunks, response.chunks);
        assert_eq!(chunks.len(), 3);
    }

    #[test]
    fn rejects_invalid_chunk_size() {
        let request = ChunkTextDocumentRequest {
            document_id: Uuid::new_v4(),
            book_id: Uuid::new_v4(),
            content: "conteudo".to_owned(),
            language: Language::Pt,
            max_words_per_chunk: 0,
        };

        let result = chunk_text_document_from_request(request);

        assert_eq!(
            result.unwrap_err(),
            "O tamanho do chunk deve ser maior que zero."
        );
    }
}
