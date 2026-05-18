#[cfg(feature = "tauri-app")]
pub mod app_storage;
pub mod archive_imported_document;
pub mod chunk_text_document;
pub mod generate_study_cards;
pub mod import_text_book;
pub mod list_archived_documents;
pub mod list_document_chunks;
pub mod list_imported_documents;
pub mod list_study_cards;
pub mod list_study_session_summaries;
pub mod list_study_reviews;
pub mod ollama_settings;
pub mod save_study_cards;
pub mod save_study_review;
pub mod restore_imported_document;
pub mod start_study_session;
pub mod test_ollama_connection;

#[cfg(feature = "tauri-app")]
pub use archive_imported_document::archive_imported_document;
#[cfg(feature = "tauri-app")]
pub use chunk_text_document::chunk_text_document;
#[cfg(feature = "tauri-app")]
pub use generate_study_cards::generate_study_cards;
#[cfg(feature = "tauri-app")]
pub use import_text_book::import_text_book;
#[cfg(feature = "tauri-app")]
pub use list_archived_documents::list_archived_documents;
#[cfg(feature = "tauri-app")]
pub use list_document_chunks::list_document_chunks;
#[cfg(feature = "tauri-app")]
pub use list_imported_documents::list_imported_documents;
#[cfg(feature = "tauri-app")]
pub use list_study_cards::list_study_cards;
#[cfg(feature = "tauri-app")]
pub use list_study_session_summaries::list_study_session_summaries;
#[cfg(feature = "tauri-app")]
pub use list_study_reviews::list_study_reviews;
#[cfg(feature = "tauri-app")]
pub use ollama_settings::{load_ollama_settings, save_ollama_settings};
#[cfg(feature = "tauri-app")]
pub use save_study_cards::save_study_cards;
#[cfg(feature = "tauri-app")]
pub use save_study_review::save_study_review;
#[cfg(feature = "tauri-app")]
pub use restore_imported_document::restore_imported_document;
#[cfg(feature = "tauri-app")]
pub use start_study_session::start_study_session;
#[cfg(feature = "tauri-app")]
pub use test_ollama_connection::test_ollama_connection;

pub use archive_imported_document::{
    archive_imported_document_with_storage, ArchiveImportedDocumentRequest,
    ArchiveImportedDocumentResponse,
};
pub use chunk_text_document::{
    chunk_text_document_from_request, ChunkTextDocumentRequest, ChunkTextDocumentResponse,
};
pub use generate_study_cards::{
    generate_study_cards_with_adapter, GenerateStudyCardsRequest, GenerateStudyCardsResponse,
};
pub use import_text_book::{
    import_text_book_from_path, import_text_book_with_storage, ImportTextBookResponse,
};
pub use list_archived_documents::{
    list_archived_documents_from_storage, ListArchivedDocumentsResponse,
};
pub use list_document_chunks::{list_document_chunks_from_storage, ListDocumentChunksResponse};
pub use list_imported_documents::{
    list_imported_documents_from_storage, ListImportedDocumentsResponse,
};
pub use list_study_cards::{list_study_cards_from_storage, ListStudyCardsResponse};
pub use list_study_session_summaries::{
    list_study_session_summaries_from_storage, ListStudySessionSummariesResponse,
};
pub use list_study_reviews::{list_study_reviews_from_storage, ListStudyReviewsResponse};
pub use ollama_settings::{
    default_ollama_settings, load_ollama_settings_from_storage, save_ollama_settings_with_storage,
    OllamaSettings,
};
pub use save_study_cards::{save_study_cards_with_storage, SaveStudyCardsResponse};
pub use save_study_review::{
    save_study_review_with_storage, SaveStudyReviewRequest, SaveStudyReviewResponse,
};
pub use restore_imported_document::{
    restore_imported_document_with_storage, RestoreImportedDocumentRequest,
    RestoreImportedDocumentResponse,
};
pub use start_study_session::{
    start_study_session_with_storage, StartStudySessionRequest, StartStudySessionResponse,
};
pub use test_ollama_connection::{
    test_ollama_connection_with_adapter, TestOllamaConnectionRequest, TestOllamaConnectionResponse,
};
