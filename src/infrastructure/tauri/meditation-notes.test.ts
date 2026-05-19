import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addMeditationNote, loadMeditationNotes } from "./meditation-notes";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("meditation notes bridge", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("loads the meditation notes for a document", async () => {
    invokeMock.mockResolvedValue({
      document_id: "document-1",
      notes: [
        {
          id: "note-1",
          content: "Resumo pessoal.",
          created_at: "2026-05-19T14:00:00Z"
        }
      ]
    });

    const notes = await loadMeditationNotes("document-1");

    expect(invokeMock).toHaveBeenCalledWith("load_meditation_notes", {
      documentId: "document-1"
    });
    expect(notes).toEqual({
      document_id: "document-1",
      notes: [
        {
          id: "note-1",
          content: "Resumo pessoal.",
          created_at: "2026-05-19T14:00:00Z"
        }
      ]
    });
  });

  it("adds a meditation note for a document", async () => {
    invokeMock.mockResolvedValue({
      document_id: "document-1",
      notes: [
        {
          id: "note-1",
          content: "O leitor entendeu os conceitos principais.",
          created_at: "2026-05-19T14:10:00Z"
        }
      ]
    });

    const result = await addMeditationNote(
      "document-1",
      "O leitor entendeu os conceitos principais."
    );

    expect(invokeMock).toHaveBeenCalledWith("add_meditation_note", {
      request: {
        document_id: "document-1",
        content: "O leitor entendeu os conceitos principais."
      }
    });
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].content).toBe("O leitor entendeu os conceitos principais.");
  });
});
