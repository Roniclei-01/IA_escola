import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listImportedDocuments } from "./list-imported-documents";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("listImportedDocuments", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("invokes the Tauri list_imported_documents command", async () => {
    invokeMock.mockResolvedValue({
      documents: [
        {
          document_id: "document-1",
          book_id: "book-1",
          content: "conteudo salvo",
          language: "Pt"
        }
      ]
    });

    const result = await listImportedDocuments();

    expect(invokeMock).toHaveBeenCalledWith("list_imported_documents");
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].content).toBe("conteudo salvo");
  });
});
