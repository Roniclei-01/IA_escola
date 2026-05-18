import { invoke } from "@tauri-apps/api/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateStudyCardsWithOllama } from "./generate-study-cards";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("generateStudyCardsWithOllama", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns no cards for empty chunks without invoking Tauri", async () => {
    const cards = await generateStudyCardsWithOllama([]);

    expect(cards).toEqual([]);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("invokes the Tauri generate_study_cards command", async () => {
    const chunk = {
      id: "chunk-1",
      book_id: "book-1",
      document_id: "document-1",
      position: 1,
      content: "conteudo",
      token_estimate: 1
    };
    invokeMock.mockResolvedValue({
      cards: [
        {
          id: "card-1",
          book_id: "book-1",
          chunk_id: "chunk-1",
          front: "Pergunta",
          back: "Resposta",
          tags: ["ollama"]
        }
      ]
    });

    const cards = await generateStudyCardsWithOllama([chunk]);

    expect(invokeMock).toHaveBeenCalledWith("generate_study_cards", {
      request: {
        chunks: [chunk],
        cards_per_chunk: 1,
        language: "Pt"
      }
    });
    expect(cards).toEqual([
      {
        id: "card-1",
        bookId: "book-1",
        chunkId: "chunk-1",
        front: "Pergunta",
        back: "Resposta",
        tags: ["ollama"]
      }
    ]);
  });

  it("generates cards one chunk at a time to keep Ollama requests small", async () => {
    const firstChunk = {
      id: "chunk-1",
      book_id: "book-1",
      document_id: "document-1",
      position: 1,
      content: "primeiro conteudo",
      token_estimate: 1
    };
    const secondChunk = {
      id: "chunk-2",
      book_id: "book-1",
      document_id: "document-1",
      position: 2,
      content: "segundo conteudo",
      token_estimate: 1
    };
    invokeMock
      .mockResolvedValueOnce({
        cards: [
          {
            id: "card-1",
            book_id: "book-1",
            chunk_id: "chunk-1",
            front: "Pergunta 1",
            back: "Resposta 1",
            tags: ["ollama"]
          }
        ]
      })
      .mockResolvedValueOnce({
        cards: [
          {
            id: "card-2",
            book_id: "book-1",
            chunk_id: "chunk-2",
            front: "Pergunta 2",
            back: "Resposta 2",
            tags: ["ollama"]
          }
        ]
      });

    const cards = await generateStudyCardsWithOllama([firstChunk, secondChunk]);

    expect(invokeMock).toHaveBeenNthCalledWith(1, "generate_study_cards", {
      request: {
        chunks: [firstChunk],
        cards_per_chunk: 1,
        language: "Pt"
      }
    });
    expect(invokeMock).toHaveBeenNthCalledWith(2, "generate_study_cards", {
      request: {
        chunks: [secondChunk],
        cards_per_chunk: 1,
        language: "Pt"
      }
    });
    expect(cards).toEqual([
      {
        id: "card-1",
        bookId: "book-1",
        chunkId: "chunk-1",
        front: "Pergunta 1",
        back: "Resposta 1",
        tags: ["ollama"]
      },
      {
        id: "card-2",
        bookId: "book-1",
        chunkId: "chunk-2",
        front: "Pergunta 2",
        back: "Resposta 2",
        tags: ["ollama"]
      }
    ]);
  });

  it("rejects when card generation times out", async () => {
    vi.useFakeTimers();
    const chunk = {
      id: "chunk-timeout",
      book_id: "book-timeout",
      document_id: "document-timeout",
      position: 1,
      content: "conteudo longo",
      token_estimate: 2
    };
    invokeMock.mockImplementation(() => new Promise(() => {}));

    const result = generateStudyCardsWithOllama([chunk], { timeoutMs: 1000 });
    const expectation = expect(result).rejects.toThrow(
      "A geracao de cards demorou demais. Tente gerar menos cards ou usar um modelo menor."
    );

    await vi.advanceTimersByTimeAsync(1000);
    await expectation;
  });
});
