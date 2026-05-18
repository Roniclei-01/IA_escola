import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chunkTextDocument, toChunkRequest } from "./chunk-text-document";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("chunkTextDocument", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("maps an imported document to a chunk request", () => {
    const request = toChunkRequest(
      {
        document_id: "document-1",
        book_id: "book-1",
        content: "conteudo",
        language: "Pt"
      },
      120
    );

    expect(request).toEqual({
      document_id: "document-1",
      book_id: "book-1",
      content: "conteudo",
      language: "Pt",
      max_words_per_chunk: 120
    });
  });

  it("invokes the Tauri chunk_text_document command", async () => {
    const request = {
      document_id: "document-1",
      book_id: "book-1",
      content: "um dois tres",
      language: "Pt" as const,
      max_words_per_chunk: 2
    };
    invokeMock.mockResolvedValue({
      chunks: [
        {
          id: "chunk-1",
          book_id: "book-1",
          document_id: "document-1",
          position: 0,
          content: "um dois",
          token_estimate: 2
        }
      ]
    });

    const result = await chunkTextDocument(request);

    expect(invokeMock).toHaveBeenCalledWith("chunk_text_document", {
      request
    });
    expect(result.chunks).toHaveLength(1);
  });
});
