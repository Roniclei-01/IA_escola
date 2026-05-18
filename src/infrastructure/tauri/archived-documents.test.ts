import { describe, expect, it, vi } from "vitest";
import {
  deleteImportedDocument,
  listArchivedDocuments,
  restoreImportedDocument
} from "./archived-documents";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock
}));

describe("archived documents Tauri bridge", () => {
  it("lists archived documents", async () => {
    invokeMock.mockResolvedValueOnce({
      documents: [
        {
          document_id: "document-1",
          book_id: "book-1",
          content: "Documento arquivado",
          language: "Pt"
        }
      ]
    });

    const response = await listArchivedDocuments();

    expect(invokeMock).toHaveBeenCalledWith("list_archived_documents");
    expect(response.documents[0].document_id).toBe("document-1");
  });

  it("restores an archived document", async () => {
    invokeMock.mockResolvedValueOnce({
      document_id: "document-1"
    });

    const response = await restoreImportedDocument("document-1");

    expect(invokeMock).toHaveBeenCalledWith("restore_imported_document", {
      request: {
        document_id: "document-1"
      }
    });
    expect(response.document_id).toBe("document-1");
  });

  it("deletes an archived document", async () => {
    invokeMock.mockResolvedValueOnce({
      document_id: "document-1"
    });

    const response = await deleteImportedDocument("document-1");

    expect(invokeMock).toHaveBeenCalledWith("delete_imported_document", {
      request: {
        document_id: "document-1"
      }
    });
    expect(response.document_id).toBe("document-1");
  });
});
