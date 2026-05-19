import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { translateDocument } from "./translate-document";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("translateDocument", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("invokes the Tauri translate_document command", async () => {
    invokeMock.mockResolvedValue({
      document_id: "document-1",
      source_language: "Pt",
      target_language: "En",
      translated_content: "Translated content."
    });

    const result = await translateDocument({
      document_id: "document-1",
      content: "Conteudo original.",
      source_language: "Pt",
      target_language: "En"
    });

    expect(invokeMock).toHaveBeenCalledWith("translate_document", {
      request: {
        document_id: "document-1",
        content: "Conteudo original.",
        source_language: "Pt",
        target_language: "En"
      }
    });
    expect(result.translated_content).toBe("Translated content.");
  });

  it("passes an optional reader page index", async () => {
    invokeMock.mockResolvedValue({
      document_id: "document-1",
      source_language: "Pt",
      target_language: "En",
      translated_content: "Translated page.",
      page_index: 2
    });

    const result = await translateDocument({
      document_id: "document-1",
      content: "Pagina original.",
      source_language: "Pt",
      target_language: "En",
      page_index: 2
    });

    expect(invokeMock).toHaveBeenCalledWith("translate_document", {
      request: {
        document_id: "document-1",
        content: "Pagina original.",
        source_language: "Pt",
        target_language: "En",
        page_index: 2
      }
    });
    expect(result.page_index).toBe(2);
  });
});
