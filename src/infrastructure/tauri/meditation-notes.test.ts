import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadMeditationNote, saveMeditationNote } from "./meditation-notes";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("meditation notes bridge", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("loads the meditation note for a document", async () => {
    invokeMock.mockResolvedValue({
      document_id: "document-1",
      content: "Resumo pessoal."
    });

    const note = await loadMeditationNote("document-1");

    expect(invokeMock).toHaveBeenCalledWith("load_meditation_note", {
      documentId: "document-1"
    });
    expect(note).toEqual({
      document_id: "document-1",
      content: "Resumo pessoal."
    });
  });

  it("saves the meditation note for a document", async () => {
    invokeMock.mockResolvedValue({
      document_id: "document-1",
      content: "O leitor entendeu os conceitos principais."
    });

    const note = await saveMeditationNote(
      "document-1",
      "O leitor entendeu os conceitos principais."
    );

    expect(invokeMock).toHaveBeenCalledWith("save_meditation_note", {
      request: {
        document_id: "document-1",
        content: "O leitor entendeu os conceitos principais."
      }
    });
    expect(note.content).toBe("O leitor entendeu os conceitos principais.");
  });
});
