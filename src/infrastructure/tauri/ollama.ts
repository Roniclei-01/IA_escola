import { invoke } from "@tauri-apps/api/core";

export interface TestOllamaConnectionRequest {
  model: string;
  base_url?: string;
}

export interface TestOllamaConnectionResponse {
  ok: boolean;
  model: string;
  response: string;
}

export async function testOllamaConnection(
  request: TestOllamaConnectionRequest
): Promise<TestOllamaConnectionResponse> {
  return invoke<TestOllamaConnectionResponse>("test_ollama_connection", {
    request
  });
}
