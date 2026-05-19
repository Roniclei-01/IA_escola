import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listDocumentPageTranslations } from "./list-document-page-translations";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("listDocumentPageTranslations", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("invokes the Tauri list_document_page_translations command", async () => {
    invokeMock.mockResolvedValue({
      page_indexes: [0, 2]
    });

    const result = await listDocumentPageTranslations("document-1", "En");

    expect(invokeMock).toHaveBeenCalledWith("list_document_page_translations", {
      request: {
        document_id: "document-1",
        target_language: "En"
      }
    });
    expect(result.page_indexes).toEqual([0, 2]);
  });
});
