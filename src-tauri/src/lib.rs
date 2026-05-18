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
        .invoke_handler(tauri::generate_handler![
            health_check,
            commands::import_text_book::import_text_book,
            commands::chunk_text_document::chunk_text_document,
            commands::list_imported_documents::list_imported_documents
        ])
        .run(tauri::generate_context!())
        .expect("failed to run tauri application");
}

#[cfg(not(feature = "tauri-app"))]
pub fn run() {}
