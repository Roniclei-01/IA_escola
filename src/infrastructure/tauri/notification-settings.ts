import { invoke } from "@tauri-apps/api/core";

export interface NotificationSettings {
  study_goal_reminders_enabled: boolean;
}

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  return invoke<NotificationSettings>("load_notification_settings");
}

export async function saveNotificationSettings(
  settings: NotificationSettings
): Promise<NotificationSettings> {
  return invoke<NotificationSettings>("save_notification_settings", {
    settings
  });
}
