pub mod chunk_text_document;
pub mod import_text_book;

#[cfg(feature = "tauri-app")]
pub use chunk_text_document::chunk_text_document;
#[cfg(feature = "tauri-app")]
pub use import_text_book::import_text_book;

pub use chunk_text_document::{
    chunk_text_document_from_request, ChunkTextDocumentRequest, ChunkTextDocumentResponse,
};
pub use import_text_book::{import_text_book_from_path, ImportTextBookResponse};
