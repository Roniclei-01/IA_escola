import { invoke } from "@tauri-apps/api/core";

export interface OllamaSettings {
  base_url: string;
  model: string;
}

export async function loadOllamaSettings(): Promise<OllamaSettings> {
  return invoke<OllamaSettings>("load_ollama_settings");
}

export async function saveOllamaSettings(settings: OllamaSettings): Promise<OllamaSettings> {
  return invoke<OllamaSettings>("save_ollama_settings", {
    settings
  });
}
