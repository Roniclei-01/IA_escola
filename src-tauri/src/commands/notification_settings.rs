use serde::{Deserialize, Serialize};

use crate::infrastructure::storage::{SQLiteStorage, StorageError};

const STUDY_GOAL_REMINDERS_ENABLED_KEY: &str = "notifications.study_goal_reminders_enabled";

#[derive(Debug, Clone, Eq, PartialEq, Deserialize, Serialize)]
pub struct NotificationSettings {
    pub study_goal_reminders_enabled: bool,
}

pub fn default_notification_settings() -> NotificationSettings {
    NotificationSettings {
        study_goal_reminders_enabled: true,
    }
}

pub fn load_notification_settings_from_storage(
    storage: &SQLiteStorage,
) -> Result<NotificationSettings, String> {
    let defaults = default_notification_settings();
    let study_goal_reminders_enabled = storage
        .load_setting(STUDY_GOAL_REMINDERS_ENABLED_KEY)
        .map_err(format_load_error)?
        .map(|value| value == "true")
        .unwrap_or(defaults.study_goal_reminders_enabled);

    Ok(NotificationSettings {
        study_goal_reminders_enabled,
    })
}

pub fn save_notification_settings_with_storage(
    settings: NotificationSettings,
    storage: &SQLiteStorage,
) -> Result<NotificationSettings, String> {
    storage
        .save_setting(
            STUDY_GOAL_REMINDERS_ENABLED_KEY,
            if settings.study_goal_reminders_enabled {
                "true"
            } else {
                "false"
            },
        )
        .map_err(format_save_error)?;

    Ok(settings)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn load_notification_settings(
    app_handle: tauri::AppHandle,
) -> Result<NotificationSettings, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    load_notification_settings_from_storage(&storage)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn save_notification_settings(
    app_handle: tauri::AppHandle,
    settings: NotificationSettings,
) -> Result<NotificationSettings, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    save_notification_settings_with_storage(settings, &storage)
}

fn format_load_error(_error: StorageError) -> String {
    "Nao foi possivel carregar as configuracoes de notificacao.".to_owned()
}

fn format_save_error(_error: StorageError) -> String {
    "Nao foi possivel salvar as configuracoes de notificacao.".to_owned()
}

#[cfg(test)]
mod tests {
    use super::{
        default_notification_settings, load_notification_settings_from_storage,
        save_notification_settings_with_storage, NotificationSettings,
    };
    use crate::infrastructure::storage::SQLiteStorage;

    #[test]
    fn loads_default_notification_settings_when_empty() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let settings = load_notification_settings_from_storage(&storage).unwrap();

        assert_eq!(settings, default_notification_settings());
    }

    #[test]
    fn saves_and_loads_notification_settings() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        save_notification_settings_with_storage(
            NotificationSettings {
                study_goal_reminders_enabled: false,
            },
            &storage,
        )
        .unwrap();

        let settings = load_notification_settings_from_storage(&storage).unwrap();

        assert_eq!(
            settings,
            NotificationSettings {
                study_goal_reminders_enabled: false,
            }
        );
    }
}
