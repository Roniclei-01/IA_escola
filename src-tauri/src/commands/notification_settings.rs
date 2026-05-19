use serde::{Deserialize, Serialize};

use crate::infrastructure::storage::{SQLiteStorage, StorageError};

const STUDY_GOAL_REMINDERS_ENABLED_KEY: &str = "notifications.study_goal_reminders_enabled";
const STUDY_GOAL_REMINDER_TIME_KEY: &str = "notifications.study_goal_reminder_time";
const DEFAULT_STUDY_GOAL_REMINDER_TIME: &str = "08:00";

#[derive(Debug, Clone, Eq, PartialEq, Deserialize, Serialize)]
pub struct NotificationSettings {
    pub study_goal_reminders_enabled: bool,
    pub study_goal_reminder_time: String,
}

pub fn default_notification_settings() -> NotificationSettings {
    NotificationSettings {
        study_goal_reminders_enabled: true,
        study_goal_reminder_time: DEFAULT_STUDY_GOAL_REMINDER_TIME.to_owned(),
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
    let study_goal_reminder_time = storage
        .load_setting(STUDY_GOAL_REMINDER_TIME_KEY)
        .map_err(format_load_error)?
        .filter(|value| is_valid_reminder_time(value))
        .unwrap_or(defaults.study_goal_reminder_time);

    Ok(NotificationSettings {
        study_goal_reminders_enabled,
        study_goal_reminder_time,
    })
}

pub fn save_notification_settings_with_storage(
    settings: NotificationSettings,
    storage: &SQLiteStorage,
) -> Result<NotificationSettings, String> {
    if !is_valid_reminder_time(&settings.study_goal_reminder_time) {
        return Err("Horario de lembrete invalido.".to_owned());
    }

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
    storage
        .save_setting(
            STUDY_GOAL_REMINDER_TIME_KEY,
            &settings.study_goal_reminder_time,
        )
        .map_err(format_save_error)?;

    Ok(settings)
}

fn is_valid_reminder_time(value: &str) -> bool {
    let Some((hour, minute)) = value.split_once(':') else {
        return false;
    };

    if hour.len() != 2 || minute.len() != 2 {
        return false;
    }

    let Ok(hour) = hour.parse::<u8>() else {
        return false;
    };
    let Ok(minute) = minute.parse::<u8>() else {
        return false;
    };

    hour < 24 && minute < 60
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
                study_goal_reminder_time: "19:30".to_owned(),
            },
            &storage,
        )
        .unwrap();

        let settings = load_notification_settings_from_storage(&storage).unwrap();

        assert_eq!(
            settings,
            NotificationSettings {
                study_goal_reminders_enabled: false,
                study_goal_reminder_time: "19:30".to_owned(),
            }
        );
    }

    #[test]
    fn rejects_invalid_notification_time() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let result = save_notification_settings_with_storage(
            NotificationSettings {
                study_goal_reminders_enabled: true,
                study_goal_reminder_time: "24:00".to_owned(),
            },
            &storage,
        );

        assert_eq!(result, Err("Horario de lembrete invalido.".to_owned()));
    }
}
