import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateStudyCardsWithOllama } from "./generate-study-cards";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("generateStudyCardsWithOllama", () => {
  beforeEach(() => {
    invokeMock.mockReset();
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
});
