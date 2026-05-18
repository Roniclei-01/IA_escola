#[cfg(feature = "tauri-app")]
pub mod app_storage;
pub mod chunk_text_document;
pub mod import_text_book;
pub mod list_imported_documents;

#[cfg(feature = "tauri-app")]
pub use chunk_text_document::chunk_text_document;
#[cfg(feature = "tauri-app")]
pub use import_text_book::import_text_book;
#[cfg(feature = "tauri-app")]
pub use list_imported_documents::list_imported_documents;

pub use chunk_text_document::{
    chunk_text_document_from_request, ChunkTextDocumentRequest, ChunkTextDocumentResponse,
};
pub use import_text_book::{
    import_text_book_from_path, import_text_book_with_storage, ImportTextBookResponse,
};
pub use list_imported_documents::{
    list_imported_documents_from_storage, ListImportedDocumentsResponse,
};
