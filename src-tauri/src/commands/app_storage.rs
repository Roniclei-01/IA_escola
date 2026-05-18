use std::fs;

use crate::infrastructure::storage::SQLiteStorage;

#[cfg(feature = "tauri-app")]
pub fn open_app_storage(app_handle: &tauri::AppHandle) -> Result<SQLiteStorage, String> {
    use tauri::Manager;

    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|_| "Nao foi possivel localizar o diretorio de dados do app.".to_owned())?;

    fs::create_dir_all(&data_dir)
        .map_err(|_| "Nao foi possivel criar o diretorio de dados do app.".to_owned())?;

    SQLiteStorage::open(data_dir.join("estudo-ia-local.sqlite3"))
        .map_err(|_| "Nao foi possivel abrir o banco local.".to_owned())
}
