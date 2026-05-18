import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportTextFile } from "./export-text-file";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn()
}));

const invokeMock = vi.mocked(invoke);
const saveMock = vi.mocked(save);

describe("exportTextFile", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    saveMock.mockReset();
  });

  it("opens a native save dialog and writes the selected TSV file", async () => {
    saveMock.mockResolvedValue("/tmp/anki-documento.tsv");
    invokeMock.mockResolvedValue({ file_path: "/tmp/anki-documento.tsv" });

    const response = await exportTextFile("anki-documento.tsv", "front\tback\n");

    expect(saveMock).toHaveBeenCalledWith({
      title: "Exportar arquivo",
      defaultPath: "anki-documento.tsv",
      filters: [{ name: "Anki TSV", extensions: ["tsv"] }]
    });
    expect(invokeMock).toHaveBeenCalledWith("export_text_file", {
      filePath: "/tmp/anki-documento.tsv",
      content: "front\tback\n"
    });
    expect(response).toEqual({ file_path: "/tmp/anki-documento.tsv" });
  });

  it("does not write when the user cancels the save dialog", async () => {
    saveMock.mockResolvedValue(null);

    const response = await exportTextFile("anki-documento.tsv", "front\tback\n");

    expect(response).toBeNull();
    expect(invokeMock).not.toHaveBeenCalled();
  });
});
