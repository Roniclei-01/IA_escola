import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadDocumentTranslation } from "./load-document-translation";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("loadDocumentTranslation", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("invokes the Tauri load_document_translation command", async () => {
    invokeMock.mockResolvedValue({
      translation: {
        document_id: "document-1",
        source_language: "Pt",
        target_language: "En",
        translated_content: "Saved translation."
      }
    });

    const result = await loadDocumentTranslation("document-1", "En");

    expect(invokeMock).toHaveBeenCalledWith("load_document_translation", {
      request: {
        document_id: "document-1",
        target_language: "En"
      }
    });
    expect(result.translation?.translated_content).toBe("Saved translation.");
  });

  it("passes an optional reader page index", async () => {
    invokeMock.mockResolvedValue({
      translation: {
        document_id: "document-1",
        source_language: "Pt",
        target_language: "En",
        translated_content: "Saved page translation."
      }
    });

    const result = await loadDocumentTranslation("document-1", "En", 3);

    expect(invokeMock).toHaveBeenCalledWith("load_document_translation", {
      request: {
        document_id: "document-1",
        target_language: "En",
        page_index: 3
      }
    });
    expect(result.translation?.translated_content).toBe("Saved page translation.");
  });
});
