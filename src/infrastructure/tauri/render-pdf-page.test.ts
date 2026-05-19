import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderPdfPage } from "./render-pdf-page";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("renderPdfPage", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("invokes the Tauri render_pdf_page command", async () => {
    invokeMock.mockResolvedValue({
      page: 2,
      page_count: 10,
      image_data_url: "data:image/png;base64,UE5H"
    });

    const result = await renderPdfPage({
      file_path: "/tmp/book.pdf",
      page: 2,
      dpi: 144
    });

    expect(invokeMock).toHaveBeenCalledWith("render_pdf_page", {
      request: {
        file_path: "/tmp/book.pdf",
        page: 2,
        dpi: 144
      }
    });
    expect(result.page_count).toBe(10);
    expect(result.image_data_url).toBe("data:image/png;base64,UE5H");
  });
});
