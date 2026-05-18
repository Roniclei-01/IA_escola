import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadOllamaSettings, saveOllamaSettings } from "./ollama-settings";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("ollama settings", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("loads Ollama settings from Tauri", async () => {
    invokeMock.mockResolvedValue({
      base_url: "http://127.0.0.1:11434",
      model: "llama3.2:1b"
    });

    const settings = await loadOllamaSettings();

    expect(invokeMock).toHaveBeenCalledWith("load_ollama_settings");
    expect(settings.model).toBe("llama3.2:1b");
  });

  it("saves Ollama settings through Tauri", async () => {
    const settings = {
      base_url: "http://127.0.0.1:11434",
      model: "mistral"
    };
    invokeMock.mockResolvedValue(settings);

    const result = await saveOllamaSettings(settings);

    expect(invokeMock).toHaveBeenCalledWith("save_ollama_settings", {
      settings
    });
    expect(result).toEqual(settings);
  });
});
