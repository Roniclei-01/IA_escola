import { describe, expect, it, vi } from "vitest";
import { archiveImportedDocument } from "./archive-imported-document";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock
}));

describe("archive imported document Tauri bridge", () => {
  it("archives an imported document", async () => {
    invokeMock.mockResolvedValueOnce({
      document_id: "document-1"
    });

    const response = await archiveImportedDocument("document-1");

    expect(invokeMock).toHaveBeenCalledWith("archive_imported_document", {
      request: {
        document_id: "document-1"
      }
    });
    expect(response.document_id).toBe("document-1");
  });
});
