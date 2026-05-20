import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportAnkiPackage } from "./export-anki-package";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn()
}));

const invokeMock = vi.mocked(invoke);
const saveMock = vi.mocked(save);

describe("exportAnkiPackage", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    saveMock.mockReset();
  });

  it("opens a native save dialog and exports an APKG package", async () => {
    saveMock.mockResolvedValue("/tmp/anki-documento.apkg");
    invokeMock.mockResolvedValue({ file_path: "/tmp/anki-documento.apkg", card_count: 1 });

    const response = await exportAnkiPackage("anki-documento.apkg", "Documento", [
      {
        id: "card-1",
        bookId: "book-1",
        chunkId: "chunk-1",
        front: "Pergunta",
        back: "Resposta",
        tags: ["estudo"]
      }
    ]);

    expect(saveMock).toHaveBeenCalledWith({
      title: "Exportar Anki",
      defaultPath: "anki-documento.apkg",
      filters: [{ name: "Anki APKG", extensions: ["apkg"] }]
    });
    expect(invokeMock).toHaveBeenCalledWith("export_anki_package", {
      filePath: "/tmp/anki-documento.apkg",
      deckName: "Documento",
      cards: [
        {
          id: "card-1",
          front: "Pergunta",
          back: "Resposta",
          tags: ["estudo"]
        }
      ]
    });
    expect(response).toEqual({ file_path: "/tmp/anki-documento.apkg", card_count: 1 });
  });

  it("does not export when the user cancels the save dialog", async () => {
    saveMock.mockResolvedValue(null);

    const response = await exportAnkiPackage("anki-documento.apkg", "Documento", []);

    expect(response).toBeNull();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("sends multiple choice metadata to the APKG exporter", async () => {
    saveMock.mockResolvedValue("/tmp/anki-documento.apkg");
    invokeMock.mockResolvedValue({ file_path: "/tmp/anki-documento.apkg", card_count: 1 });

    await exportAnkiPackage("anki-documento.apkg", "Documento", [
      {
        id: "card-1",
        bookId: "book-1",
        chunkId: "chunk-1",
        front: "Qual protocolo confirma entrega?",
        back: "TCP",
        tags: ["redes"],
        cardType: "multiple_choice",
        choices: ["TCP", "UDP", "ARP", "ICMP"],
        correctChoiceIndex: 0,
        explanation: "TCP controla entrega e retransmissao."
      }
    ]);

    expect(invokeMock).toHaveBeenCalledWith("export_anki_package", {
      filePath: "/tmp/anki-documento.apkg",
      deckName: "Documento",
      cards: [
        {
          id: "card-1",
          front: "Qual protocolo confirma entrega?",
          back: "TCP",
          tags: ["redes"],
          card_type: "multiple_choice",
          choices: ["TCP", "UDP", "ARP", "ICMP"],
          correct_choice_index: 0,
          explanation: "TCP controla entrega e retransmissao."
        }
      ]
    });
  });
});
