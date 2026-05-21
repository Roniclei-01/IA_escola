pub mod app;
pub mod commands;
pub mod domain;
pub mod infrastructure;

#[cfg(feature = "tauri-app")]
#[tauri::command]
fn health_check() -> &'static str {
    "ok"
}

#[cfg(feature = "tauri-app")]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            health_check,
            commands::archive_imported_document::archive_imported_document,
            commands::delete_imported_document::delete_imported_document,
            commands::document_study_metadata::load_document_study_metadata,
            commands::document_study_metadata::save_document_study_metadata,
            commands::import_text_book::import_text_book,
            commands::list_archived_documents::list_archived_documents,
            commands::list_document_page_translations::list_document_page_translations,
            commands::load_document_translation::load_document_translation,
            commands::chunk_text_document::chunk_text_document,
            commands::list_imported_documents::list_imported_documents,
            commands::list_document_chunks::list_document_chunks,
            commands::save_study_cards::save_study_cards,
            commands::delete_study_cards::delete_study_cards,
            commands::list_study_cards::list_study_cards,
            commands::save_study_review::save_study_review,
            commands::start_study_session::start_study_session,
            commands::list_study_session_summaries::list_study_session_summaries,
            commands::list_study_reviews::list_study_reviews,
            commands::license::load_license_status,
            commands::license::activate_license,
            commands::test_ocr_dependencies::test_ocr_dependencies,
            commands::test_ollama_connection::test_ollama_connection,
            commands::ollama_settings::load_ollama_settings,
            commands::ollama_settings::save_ollama_settings,
            commands::notification_settings::load_notification_settings,
            commands::notification_settings::save_notification_settings,
            commands::meditation_notes::load_meditation_notes,
            commands::meditation_notes::add_meditation_note,
            commands::meditation_notes::update_meditation_note,
            commands::meditation_notes::delete_meditation_note,
            commands::pdf_reader_preferences::load_pdf_reader_preference,
            commands::pdf_reader_preferences::save_pdf_reader_preference,
            commands::render_pdf_page::render_pdf_page,
            commands::study_goals::load_study_goal,
            commands::study_goals::save_study_goal,
            commands::study_categories::list_study_categories,
            commands::study_categories::save_study_category,
            commands::study_categories::archive_study_category,
            commands::study_categories::restore_study_category,
            commands::study_categories::delete_study_category,
            commands::study_category_default::load_study_category_default,
            commands::study_category_default::save_study_category_default,
            commands::restore_imported_document::restore_imported_document,
            commands::generate_study_cards::generate_study_cards,
            commands::translate_document::translate_document,
            commands::export_anki_package::export_anki_package,
            commands::export_text_file::export_text_file
        ])
        .run(tauri::generate_context!())
        .expect("failed to run tauri application");
}

#[cfg(not(feature = "tauri-app"))]
pub fn run() {}
