import { open } from "@tauri-apps/plugin-dialog";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { selectStudyFile } from "./file-dialog";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn()
}));

const openMock = vi.mocked(open);

describe("file dialog Tauri bridge", () => {
  beforeEach(() => {
    openMock.mockReset();
  });

  it("opens a native file dialog for study files", async () => {
    openMock.mockResolvedValue("/tmp/book.pdf");

    const selected = await selectStudyFile();

    expect(openMock).toHaveBeenCalledWith({
      multiple: false,
      directory: false,
      filters: [
        {
          name: "Study files",
          extensions: ["txt", "pdf"]
        }
      ]
    });
    expect(selected).toBe("/tmp/book.pdf");
  });

  it("returns null when the user cancels the dialog", async () => {
    openMock.mockResolvedValue(null);

    await expect(selectStudyFile()).resolves.toBeNull();
  });
});
