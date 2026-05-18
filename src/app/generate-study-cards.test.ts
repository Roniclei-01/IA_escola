import { describe, expect, it } from "vitest";
import { MockModelAdapter } from "../domain/mock-model-adapter";
import type { ImportedDocumentChunk } from "../infrastructure/tauri/chunk-text-document";
import { generateStudyCards, mapImportedChunk } from "./generate-study-cards";

const importedChunk: ImportedDocumentChunk = {
  id: "chunk-1",
  book_id: "book-1",
  document_id: "document-1",
  position: 0,
  content: "conteudo do chunk",
  token_estimate: 3
};

describe("generateStudyCards", () => {
  it("maps imported chunks to domain chunks", () => {
    expect(mapImportedChunk(importedChunk)).toEqual({
      id: "chunk-1",
      bookId: "book-1",
      documentId: "document-1",
      position: 0,
      content: "conteudo do chunk",
      tokenEstimate: 3
    });
  });

  it("generates cards using the model adapter", async () => {
    const cards = await generateStudyCards(
      [importedChunk],
      {
        cardsPerChunk: 2,
        language: "pt"
      },
      new MockModelAdapter()
    );

    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      id: "chunk-1-card-1",
      bookId: "book-1",
      chunkId: "chunk-1",
      front: "Pergunta 1 sobre o trecho 0"
    });
  });

  it("returns no cards when there are no chunks", async () => {
    await expect(
      generateStudyCards([], { cardsPerChunk: 1, language: "pt" }, new MockModelAdapter())
    ).resolves.toEqual([]);
  });

  it("rejects invalid cards per chunk", async () => {
    await expect(
      generateStudyCards(
        [importedChunk],
        {
          cardsPerChunk: 0,
          language: "pt"
        },
        new MockModelAdapter()
      )
    ).rejects.toThrow("cards per chunk must be greater than zero");
  });
});
