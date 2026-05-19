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

  it("reports generation progress before each chunk request", async () => {
    const chunks = [
      {
        id: "chunk-1",
        book_id: "book-1",
        document_id: "document-1",
        position: 1,
        content: "primeiro conteudo",
        token_estimate: 1
      },
      {
        id: "chunk-2",
        book_id: "book-1",
        document_id: "document-1",
        position: 2,
        content: "segundo conteudo",
        token_estimate: 1
      }
    ];
    const onProgress = vi.fn();
    invokeMock.mockResolvedValue({ cards: [] });

    await generateStudyCardsWithOllama(chunks, { onProgress });

    expect(onProgress).toHaveBeenNthCalledWith(1, { current: 1, total: 2 });
    expect(onProgress).toHaveBeenNthCalledWith(2, { current: 2, total: 2 });
  });

  it("reports queue progress by chunk", async () => {
    const chunks = [
      {
        id: "chunk-1",
        book_id: "book-1",
        document_id: "document-1",
        position: 1,
        content: "primeiro conteudo",
        token_estimate: 1
      },
      {
        id: "chunk-2",
        book_id: "book-1",
        document_id: "document-1",
        position: 2,
        content: "segundo conteudo",
        token_estimate: 1
      }
    ];
    const onQueueProgress = vi.fn();
    invokeMock.mockResolvedValue({ cards: [] });

    await generateStudyCardsWithOllama(chunks, { onQueueProgress });

    expect(onQueueProgress).toHaveBeenNthCalledWith(1, {
      current: 1,
      total: 2,
      completed: 0,
      failed: 0,
      pending: 1,
      currentChunkId: "chunk-1",
      status: "running"
    });
    expect(onQueueProgress).toHaveBeenNthCalledWith(2, {
      current: 1,
      total: 2,
      completed: 1,
      failed: 0,
      pending: 1,
      currentChunkId: "chunk-1",
      status: "completed"
    });
    expect(onQueueProgress).toHaveBeenNthCalledWith(3, {
      current: 2,
      total: 2,
      completed: 1,
      failed: 0,
      pending: 0,
      currentChunkId: "chunk-2",
      status: "running"
    });
    expect(onQueueProgress).toHaveBeenNthCalledWith(4, {
      current: 2,
      total: 2,
      completed: 2,
      failed: 0,
      pending: 0,
      currentChunkId: "chunk-2",
      status: "completed"
    });
  });

  it("reports cards generated for each completed chunk", async () => {
    const chunks = [
      {
        id: "chunk-1",
        book_id: "book-1",
        document_id: "document-1",
        position: 1,
        content: "primeiro conteudo",
        token_estimate: 1
      },
      {
        id: "chunk-2",
        book_id: "book-1",
        document_id: "document-1",
        position: 2,
        content: "segundo conteudo",
        token_estimate: 1
      }
    ];
    const onChunkCards = vi.fn();
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

    await generateStudyCardsWithOllama(chunks, { onChunkCards });

    expect(onChunkCards).toHaveBeenNthCalledWith(
      1,
      [
        {
          id: "card-1",
          bookId: "book-1",
          chunkId: "chunk-1",
          front: "Pergunta 1",
          back: "Resposta 1",
          tags: ["ollama"]
        }
      ],
      { current: 1, total: 2 }
    );
    expect(onChunkCards).toHaveBeenNthCalledWith(
      2,
      [
        {
          id: "card-2",
          bookId: "book-1",
          chunkId: "chunk-2",
          front: "Pergunta 2",
          back: "Resposta 2",
          tags: ["ollama"]
        }
      ],
      { current: 2, total: 2 }
    );
  });

  it("continues with later chunks when one chunk fails after retry", async () => {
    const chunks = [
      {
        id: "chunk-1",
        book_id: "book-1",
        document_id: "document-1",
        position: 1,
        content: "primeiro conteudo",
        token_estimate: 1
      },
      {
        id: "chunk-2",
        book_id: "book-1",
        document_id: "document-1",
        position: 2,
        content: "conteudo que falha",
        token_estimate: 1
      },
      {
        id: "chunk-3",
        book_id: "book-1",
        document_id: "document-1",
        position: 3,
        content: "terceiro conteudo",
        token_estimate: 1
      }
    ];
    const chunkError = new Error("Ollama retornou JSON invalido.");
    const onChunkError = vi.fn();
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
      .mockRejectedValueOnce(chunkError)
      .mockRejectedValueOnce(chunkError)
      .mockResolvedValueOnce({
        cards: [
          {
            id: "card-3",
            book_id: "book-1",
            chunk_id: "chunk-3",
            front: "Pergunta 3",
            back: "Resposta 3",
            tags: ["ollama"]
          }
        ]
      });

    const cards = await generateStudyCardsWithOllama(chunks, { onChunkError });

    expect(invokeMock).toHaveBeenCalledTimes(4);
    expect(onChunkError).toHaveBeenCalledWith(chunks[1], { current: 2, total: 3 }, chunkError);
    expect(cards.map((card) => card.chunkId)).toEqual(["chunk-1", "chunk-3"]);
  });

  it("reports failed chunks in queue progress", async () => {
    const chunks = [
      {
        id: "chunk-1",
        book_id: "book-1",
        document_id: "document-1",
        position: 1,
        content: "conteudo que falha",
        token_estimate: 1
      }
    ];
    const chunkError = new Error("Ollama retornou JSON invalido.");
    const onQueueProgress = vi.fn();
    invokeMock.mockRejectedValue(chunkError);

    await expect(
      generateStudyCardsWithOllama(chunks, { onQueueProgress })
    ).rejects.toThrow(chunkError);

    expect(onQueueProgress).toHaveBeenNthCalledWith(1, {
      current: 1,
      total: 1,
      completed: 0,
      failed: 0,
      pending: 0,
      currentChunkId: "chunk-1",
      status: "running"
    });
    expect(onQueueProgress).toHaveBeenNthCalledWith(2, {
      current: 1,
      total: 1,
      completed: 0,
      failed: 1,
      pending: 0,
      currentChunkId: "chunk-1",
      status: "failed"
    });
  });

  it("stops before requesting the next chunk when generation is aborted", async () => {
    const abortController = new AbortController();
    const chunks = [
      {
        id: "chunk-1",
        book_id: "book-1",
        document_id: "document-1",
        position: 1,
        content: "primeiro conteudo",
        token_estimate: 1
      },
      {
        id: "chunk-2",
        book_id: "book-1",
        document_id: "document-1",
        position: 2,
        content: "segundo conteudo",
        token_estimate: 1
      }
    ];
    invokeMock.mockImplementationOnce(async () => {
      abortController.abort();

      return { cards: [] };
    });

    await expect(
      generateStudyCardsWithOllama(chunks, { signal: abortController.signal })
    ).rejects.toThrow("Operacao cancelada.");
    expect(invokeMock).toHaveBeenCalledTimes(1);
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
      "A geracao de cards demorou demais. Tente novamente ou use um trecho menor."
    );

    await vi.advanceTimersByTimeAsync(1000);
    await expectation;
  });
});
