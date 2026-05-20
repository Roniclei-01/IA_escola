#[cfg(feature = "tauri-app")]
pub mod app_storage;
pub mod archive_imported_document;
pub mod chunk_text_document;
pub mod delete_imported_document;
pub mod delete_study_cards;
pub mod document_study_metadata;
pub mod export_anki_package;
pub mod export_text_file;
pub mod generate_study_cards;
pub mod import_text_book;
pub mod list_archived_documents;
pub mod list_document_chunks;
pub mod list_document_page_translations;
pub mod list_imported_documents;
pub mod list_study_cards;
pub mod list_study_reviews;
pub mod list_study_session_summaries;
pub mod load_document_translation;
pub mod meditation_notes;
pub mod notification_settings;
pub mod ollama_settings;
pub mod pdf_reader_preferences;
pub mod render_pdf_page;
pub mod restore_imported_document;
pub mod save_study_cards;
pub mod save_study_review;
pub mod start_study_session;
pub mod study_categories;
pub mod study_goals;
pub mod test_ocr_dependencies;
pub mod test_ollama_connection;
pub mod translate_document;

#[cfg(feature = "tauri-app")]
pub use archive_imported_document::archive_imported_document;
#[cfg(feature = "tauri-app")]
pub use chunk_text_document::chunk_text_document;
#[cfg(feature = "tauri-app")]
pub use delete_imported_document::delete_imported_document;
#[cfg(feature = "tauri-app")]
pub use delete_study_cards::delete_study_cards;
#[cfg(feature = "tauri-app")]
pub use document_study_metadata::{load_document_study_metadata, save_document_study_metadata};
#[cfg(feature = "tauri-app")]
pub use export_anki_package::export_anki_package;
#[cfg(feature = "tauri-app")]
pub use export_text_file::export_text_file;
#[cfg(feature = "tauri-app")]
pub use generate_study_cards::generate_study_cards;
#[cfg(feature = "tauri-app")]
pub use import_text_book::import_text_book;
#[cfg(feature = "tauri-app")]
pub use list_archived_documents::list_archived_documents;
#[cfg(feature = "tauri-app")]
pub use list_document_chunks::list_document_chunks;
#[cfg(feature = "tauri-app")]
pub use list_document_page_translations::list_document_page_translations;
#[cfg(feature = "tauri-app")]
pub use list_imported_documents::list_imported_documents;
#[cfg(feature = "tauri-app")]
pub use list_study_cards::list_study_cards;
#[cfg(feature = "tauri-app")]
pub use list_study_reviews::list_study_reviews;
#[cfg(feature = "tauri-app")]
pub use list_study_session_summaries::list_study_session_summaries;
#[cfg(feature = "tauri-app")]
pub use load_document_translation::load_document_translation;
#[cfg(feature = "tauri-app")]
pub use meditation_notes::{
    add_meditation_note, delete_meditation_note, load_meditation_notes, update_meditation_note,
};
#[cfg(feature = "tauri-app")]
pub use notification_settings::{load_notification_settings, save_notification_settings};
#[cfg(feature = "tauri-app")]
pub use ollama_settings::{load_ollama_settings, save_ollama_settings};
#[cfg(feature = "tauri-app")]
pub use pdf_reader_preferences::{load_pdf_reader_preference, save_pdf_reader_preference};
#[cfg(feature = "tauri-app")]
pub use render_pdf_page::render_pdf_page;
#[cfg(feature = "tauri-app")]
pub use restore_imported_document::restore_imported_document;
#[cfg(feature = "tauri-app")]
pub use save_study_cards::save_study_cards;
#[cfg(feature = "tauri-app")]
pub use save_study_review::save_study_review;
#[cfg(feature = "tauri-app")]
pub use start_study_session::start_study_session;
#[cfg(feature = "tauri-app")]
pub use study_categories::{
    archive_study_category, delete_study_category, list_study_categories, restore_study_category,
    save_study_category,
};
#[cfg(feature = "tauri-app")]
pub use study_goals::{load_study_goal, save_study_goal};
#[cfg(feature = "tauri-app")]
pub use test_ocr_dependencies::test_ocr_dependencies;
#[cfg(feature = "tauri-app")]
pub use test_ollama_connection::test_ollama_connection;
#[cfg(feature = "tauri-app")]
pub use translate_document::translate_document;

pub use archive_imported_document::{
    archive_imported_document_with_storage, ArchiveImportedDocumentRequest,
    ArchiveImportedDocumentResponse,
};
pub use chunk_text_document::{
    chunk_text_document_from_request, ChunkTextDocumentRequest, ChunkTextDocumentResponse,
};
pub use delete_imported_document::{
    delete_imported_document_with_storage, DeleteImportedDocumentRequest,
    DeleteImportedDocumentResponse,
};
pub use delete_study_cards::{delete_study_cards_with_storage, DeleteStudyCardsResponse};
pub use document_study_metadata::{
    load_document_study_metadata_from_storage, save_document_study_metadata_with_storage,
    DocumentStudyMetadataResponse, SaveDocumentStudyMetadataRequest,
};
pub use export_anki_package::{
    export_anki_package_to_path, ExportAnkiPackageCard, ExportAnkiPackageRequest,
    ExportAnkiPackageResponse,
};
pub use export_text_file::{export_text_file_to_path, ExportTextFileResponse};
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
pub use list_document_page_translations::{
    list_document_page_translations_from_storage, ListDocumentPageTranslationsRequest,
    ListDocumentPageTranslationsResponse,
};
pub use list_imported_documents::{
    list_imported_documents_from_storage, ListImportedDocumentsResponse,
};
pub use list_study_cards::{list_study_cards_from_storage, ListStudyCardsResponse};
pub use list_study_reviews::{list_study_reviews_from_storage, ListStudyReviewsResponse};
pub use list_study_session_summaries::{
    list_study_session_summaries_from_storage, ListStudySessionSummariesResponse,
};
pub use load_document_translation::{
    load_document_translation_from_storage, LoadDocumentTranslationRequest,
    LoadDocumentTranslationResponse,
};
pub use meditation_notes::{
    add_meditation_note_with_storage, delete_meditation_note_with_storage,
    load_meditation_notes_from_storage, update_meditation_note_with_storage,
    AddMeditationNoteRequest, DeleteMeditationNoteRequest, MeditationNoteResponse,
    MeditationNotesResponse, UpdateMeditationNoteRequest,
};
pub use notification_settings::{
    default_notification_settings, load_notification_settings_from_storage,
    save_notification_settings_with_storage, NotificationSettings,
};
pub use ollama_settings::{
    default_ollama_settings, load_ollama_settings_from_storage, save_ollama_settings_with_storage,
    OllamaSettings,
};
pub use pdf_reader_preferences::{
    load_pdf_reader_preference_from_storage, save_pdf_reader_preference_with_storage,
    PdfReaderPreference,
};
pub use render_pdf_page::{
    render_pdf_page_from_request, RenderPdfPageRequest, RenderPdfPageResponse,
};
pub use restore_imported_document::{
    restore_imported_document_with_storage, RestoreImportedDocumentRequest,
    RestoreImportedDocumentResponse,
};
pub use save_study_cards::{save_study_cards_with_storage, SaveStudyCardsResponse};
pub use save_study_review::{
    save_study_review_with_storage, SaveStudyReviewRequest, SaveStudyReviewResponse,
};
pub use start_study_session::{
    start_study_session_with_storage, StartStudySessionRequest, StartStudySessionResponse,
};
pub use study_categories::{
    archive_study_category_with_storage, delete_study_category_with_storage,
    list_study_categories_from_storage, restore_study_category_with_storage,
    save_study_category_with_storage, DeleteStudyCategoryRequest, ListStudyCategoriesResponse,
    SaveStudyCategoryRequest, StudyCategoryResponse,
};
pub use study_goals::{
    load_study_goal_from_storage, save_study_goal_with_storage, SaveStudyGoalRequest,
    StudyGoalResponse,
};
pub use test_ocr_dependencies::{test_ocr_dependencies_with_checker, TestOcrDependenciesResponse};
pub use test_ollama_connection::{
    test_ollama_connection_with_adapter, TestOllamaConnectionRequest, TestOllamaConnectionResponse,
};
pub use translate_document::{
    translate_document_with_adapter, TranslateDocumentRequest, TranslateDocumentResponse,
};
