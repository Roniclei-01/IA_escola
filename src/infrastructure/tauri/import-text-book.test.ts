import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { importTextBook } from "./import-text-book";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("importTextBook", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("invokes the Tauri import_text_book command", async () => {
    invokeMock.mockResolvedValue({
      document_id: "document-1",
      book_id: "book-1",
      content: "conteudo",
      language: "Pt",
      source_type: "txt",
      source_path: "/tmp/book.txt"
    });

    const result = await importTextBook("/tmp/book.txt");

    expect(invokeMock).toHaveBeenCalledWith("import_text_book", {
      filePath: "/tmp/book.txt"
    });
    expect(result.content).toBe("conteudo");
    expect(result.source_type).toBe("txt");
  });
});
