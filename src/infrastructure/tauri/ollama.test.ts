import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testOllamaConnection } from "./ollama";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("testOllamaConnection", () => {
  beforeEach(() => {
    invokeMock.mockReset();
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
});
