import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteStudyCards,
  listStudyCards,
  saveStudyCards,
  toPersistedStudyCard,
  toStudyCard
} from "./study-cards";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("study card persistence", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("maps study cards between UI and Tauri shapes", () => {
    const card = {
      id: "card-1",
      bookId: "book-1",
      chunkId: "chunk-1",
      front: "Pergunta",
      back: "Resposta",
      tags: ["mock"]
    };

    const persistedCard = toPersistedStudyCard(card);

    expect(persistedCard).toEqual({
      id: "card-1",
      book_id: "book-1",
      chunk_id: "chunk-1",
      front: "Pergunta",
      back: "Resposta",
      tags: ["mock"]
    });
    expect(toStudyCard(persistedCard)).toEqual(card);
  });

  it("invokes the Tauri save_study_cards command", async () => {
    invokeMock.mockResolvedValue({
      cards: [
        {
          id: "card-1",
          book_id: "book-1",
          chunk_id: "chunk-1",
          front: "Pergunta",
          back: "Resposta",
          tags: ["mock"]
        }
      ]
    });

    const result = await saveStudyCards([
      {
        id: "card-1",
        bookId: "book-1",
        chunkId: "chunk-1",
        front: "Pergunta",
        back: "Resposta",
        tags: ["mock"]
      }
    ]);

    expect(invokeMock).toHaveBeenCalledWith("save_study_cards", {
      cards: [
        {
          id: "card-1",
          book_id: "book-1",
          chunk_id: "chunk-1",
          front: "Pergunta",
          back: "Resposta",
          tags: ["mock"]
        }
      ]
    });
    expect(result[0].bookId).toBe("book-1");
  });

  it("invokes the Tauri list_study_cards command", async () => {
    invokeMock.mockResolvedValue({
      cards: [
        {
          id: "card-1",
          book_id: "book-1",
          chunk_id: "chunk-1",
          front: "Pergunta",
          back: "Resposta",
          tags: []
        }
      ]
    });

    const result = await listStudyCards("document-1");

    expect(invokeMock).toHaveBeenCalledWith("list_study_cards", {
      documentId: "document-1"
    });
    expect(result[0].chunkId).toBe("chunk-1");
  });

  it("invokes the Tauri delete_study_cards command", async () => {
    invokeMock.mockResolvedValue({
      document_id: "document-1",
      deleted_cards: 3
    });

    const response = await deleteStudyCards("document-1");

    expect(invokeMock).toHaveBeenCalledWith("delete_study_cards", {
      documentId: "document-1"
    });
    expect(response.deleted_cards).toBe(3);
  });
});
