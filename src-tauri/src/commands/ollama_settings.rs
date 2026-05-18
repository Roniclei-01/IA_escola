use serde::{Deserialize, Serialize};

use crate::infrastructure::storage::{SQLiteStorage, StorageError};

const OLLAMA_BASE_URL_KEY: &str = "ollama.base_url";
const OLLAMA_MODEL_KEY: &str = "ollama.model";
const DEFAULT_OLLAMA_BASE_URL: &str = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL: &str = "llama3.2";

#[derive(Debug, Clone, Eq, PartialEq, Deserialize, Serialize)]
pub struct OllamaSettings {
    pub base_url: String,
    pub model: String,
}

pub fn default_ollama_settings() -> OllamaSettings {
    OllamaSettings {
        base_url: DEFAULT_OLLAMA_BASE_URL.to_owned(),
        model: DEFAULT_OLLAMA_MODEL.to_owned(),
    }
}

pub fn load_ollama_settings_from_storage(
    storage: &SQLiteStorage,
) -> Result<OllamaSettings, String> {
    let defaults = default_ollama_settings();
    let base_url = storage
        .load_setting(OLLAMA_BASE_URL_KEY)
        .map_err(format_load_error)?
        .unwrap_or(defaults.base_url);
    let model = storage
        .load_setting(OLLAMA_MODEL_KEY)
        .map_err(format_load_error)?
        .unwrap_or(defaults.model);

    Ok(OllamaSettings { base_url, model })
}

pub fn save_ollama_settings_with_storage(
    settings: OllamaSettings,
    storage: &SQLiteStorage,
) -> Result<OllamaSettings, String> {
    let settings = normalize_settings(settings)?;

    storage
        .save_setting(OLLAMA_BASE_URL_KEY, &settings.base_url)
        .map_err(format_save_error)?;
    storage
        .save_setting(OLLAMA_MODEL_KEY, &settings.model)
        .map_err(format_save_error)?;

    Ok(settings)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn load_ollama_settings(app_handle: tauri::AppHandle) -> Result<OllamaSettings, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    load_ollama_settings_from_storage(&storage)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn save_ollama_settings(
    app_handle: tauri::AppHandle,
    settings: OllamaSettings,
) -> Result<OllamaSettings, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    save_ollama_settings_with_storage(settings, &storage)
}

fn normalize_settings(settings: OllamaSettings) -> Result<OllamaSettings, String> {
    let base_url = settings.base_url.trim().to_owned();
    let model = settings.model.trim().to_owned();

    if base_url.is_empty() {
        return Err("Informe a URL local do Ollama.".to_owned());
    }

    if model.is_empty() {
        return Err("Informe o modelo Ollama.".to_owned());
    }

    Ok(OllamaSettings { base_url, model })
}

fn format_load_error(_error: StorageError) -> String {
    "Nao foi possivel carregar as configuracoes do Ollama.".to_owned()
}

fn format_save_error(_error: StorageError) -> String {
    "Nao foi possivel salvar as configuracoes do Ollama.".to_owned()
}

#[cfg(test)]
mod tests {
    use super::{
        default_ollama_settings, load_ollama_settings_from_storage,
        save_ollama_settings_with_storage, OllamaSettings,
    };
    use crate::infrastructure::storage::SQLiteStorage;

    #[test]
    fn loads_default_settings_when_empty() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let settings = load_ollama_settings_from_storage(&storage).unwrap();

        assert_eq!(settings, default_ollama_settings());
    }

    #[test]
    fn saves_and_loads_ollama_settings() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        save_ollama_settings_with_storage(
            OllamaSettings {
                base_url: " http://127.0.0.1:11435 ".to_owned(),
                model: " mistral ".to_owned(),
            },
            &storage,
        )
        .unwrap();

        let settings = load_ollama_settings_from_storage(&storage).unwrap();

        assert_eq!(
            settings,
            OllamaSettings {
                base_url: "http://127.0.0.1:11435".to_owned(),
                model: "mistral".to_owned(),
            }
        );
    }

    #[test]
    fn rejects_empty_ollama_model() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let result = save_ollama_settings_with_storage(
            OllamaSettings {
                base_url: "http://127.0.0.1:11434".to_owned(),
                model: " ".to_owned(),
            },
            &storage,
        );

        assert_eq!(result.unwrap_err(), "Informe o modelo Ollama.");
    }
}
