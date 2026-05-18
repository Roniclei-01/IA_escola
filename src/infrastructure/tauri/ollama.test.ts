import { invoke } from "@tauri-apps/api/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testOllamaConnection } from "./ollama";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("testOllamaConnection", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes the Tauri test_ollama_connection command", async () => {
    invokeMock.mockResolvedValue({
      ok: true,
      model: "llama3.2",
      response: "ok"
    });

    const result = await testOllamaConnection({
      model: "llama3.2",
      base_url: "http://127.0.0.1:11434"
    });

    expect(invokeMock).toHaveBeenCalledWith("test_ollama_connection", {
      request: {
        model: "llama3.2",
        base_url: "http://127.0.0.1:11434"
      }
    });
    expect(result.ok).toBe(true);
  });

  it("rejects when the Ollama connection test times out", async () => {
    vi.useFakeTimers();
    invokeMock.mockImplementation(() => new Promise(() => {}));

    const result = testOllamaConnection(
      {
        model: "llama3.2:1b",
        base_url: "http://127.0.0.1:11434"
      },
      { timeoutMs: 1000 }
    );

    const expectation = expect(result).rejects.toThrow(
      "O teste do Ollama demorou demais. Tente um modelo menor ou verifique se o Ollama esta ativo."
    );

    await vi.advanceTimersByTimeAsync(1000);
    await expectation;
  });
});
