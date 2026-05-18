import { invoke } from "@tauri-apps/api/core";

const DEFAULT_OLLAMA_CONNECTION_TIMEOUT_MS = 15000;
const OLLAMA_CONNECTION_TIMEOUT_MESSAGE =
  "O teste do Ollama demorou demais. Tente um modelo menor ou verifique se o Ollama esta ativo.";

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
  request: TestOllamaConnectionRequest,
  options: { timeoutMs?: number } = {}
): Promise<TestOllamaConnectionResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_OLLAMA_CONNECTION_TIMEOUT_MS;
  const response = invoke<TestOllamaConnectionResponse>("test_ollama_connection", {
    request
  });

  return withTimeout(response, timeoutMs);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(OLLAMA_CONNECTION_TIMEOUT_MESSAGE));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
