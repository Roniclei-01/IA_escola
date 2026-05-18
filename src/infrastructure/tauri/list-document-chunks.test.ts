import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listDocumentChunks } from "./list-document-chunks";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("listDocumentChunks", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("invokes the Tauri list_document_chunks command", async () => {
    invokeMock.mockResolvedValue({
      chunks: [
        {
          id: "chunk-1",
          book_id: "book-1",
          document_id: "document-1",
          position: 1,
          content: "chunk salvo",
          token_estimate: 2
        }
      ]
    });

    const result = await listDocumentChunks("document-1");

    expect(invokeMock).toHaveBeenCalledWith("list_document_chunks", {
      documentId: "document-1"
    });
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].content).toBe("chunk salvo");
  });
});
