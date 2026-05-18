pub mod domain;

#[cfg(feature = "tauri-app")]
#[tauri::command]
fn health_check() -> &'static str {
    "ok"
}

#[cfg(feature = "tauri-app")]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![health_check])
        .run(tauri::generate_context!())
        .expect("failed to run tauri application");
}

#[cfg(not(feature = "tauri-app"))]
pub fn run() {}
