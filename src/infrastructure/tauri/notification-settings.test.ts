import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadNotificationSettings, saveNotificationSettings } from "./notification-settings";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("notification settings", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("loads notification settings from Tauri", async () => {
    invokeMock.mockResolvedValue({
      study_goal_reminders_enabled: true
    });

    const settings = await loadNotificationSettings();

    expect(invokeMock).toHaveBeenCalledWith("load_notification_settings");
    expect(settings.study_goal_reminders_enabled).toBe(true);
  });

  it("saves notification settings through Tauri", async () => {
    const settings = {
      study_goal_reminders_enabled: false
    };
    invokeMock.mockResolvedValue(settings);

    const result = await saveNotificationSettings(settings);

    expect(invokeMock).toHaveBeenCalledWith("save_notification_settings", {
      settings
    });
    expect(result).toEqual(settings);
  });
});
