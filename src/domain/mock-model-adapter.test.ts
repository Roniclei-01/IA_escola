import { describe, expect, it } from "vitest";
import type { DocumentChunk } from "./model-adapter";
import { MockModelAdapter } from "./mock-model-adapter";

const chunk: DocumentChunk = {
  id: "chunk-1",
  bookId: "book-1",
  documentId: "doc-1",
  position: 0,
  content: "conteudo de estudo",
  tokenEstimate: 3
};

describe("MockModelAdapter", () => {
  it("creates predictable flashcards from chunks", async () => {
    const adapter = new MockModelAdapter();

    const cards = await adapter.createFlashcards([chunk], {
      cardsPerChunk: 2,
      language: "pt"
    });

    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      id: "chunk-1-card-1",
      bookId: "book-1",
      chunkId: "chunk-1",
      front: "Pergunta 1 sobre o trecho 0",
      tags: ["mock", "pt"]
    });
  });

  it("can simulate an unavailable model", async () => {
    const adapter = new MockModelAdapter();
    adapter.failNextCall();

    await expect(
      adapter.createFlashcards([chunk], {
        cardsPerChunk: 1,
        language: "pt"
      })
    ).rejects.toThrow("model is unavailable");
  });
});
