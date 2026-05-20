import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  loadPdfReaderPreference,
  savePdfReaderPreference
} from "./pdf-reader-preferences";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("pdf-reader-preferences", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("loads a persisted PDF reader preference", async () => {
    invokeMock.mockResolvedValue({
      document_id: "document-1",
      page: 4,
      zoom: 1.25,
      reader_page: 3
    });

    const preference = await loadPdfReaderPreference("document-1");

    expect(invokeMock).toHaveBeenCalledWith("load_pdf_reader_preference", {
      document_id: "document-1"
    });
    expect(preference).toEqual({
      document_id: "document-1",
      page: 4,
      zoom: 1.25,
      reader_page: 3
    });
  });

  it("saves the current PDF reader preference", async () => {
    invokeMock.mockResolvedValue({
      document_id: "document-1",
      page: 5,
      zoom: 1.5,
      reader_page: 2
    });

    const preference = await savePdfReaderPreference({
      document_id: "document-1",
      page: 5,
      zoom: 1.5,
      reader_page: 2
    });

    expect(invokeMock).toHaveBeenCalledWith("save_pdf_reader_preference", {
      preference: {
        document_id: "document-1",
        page: 5,
        zoom: 1.5,
        reader_page: 2
      }
    });
    expect(preference).toEqual({
      document_id: "document-1",
      page: 5,
      zoom: 1.5,
      reader_page: 2
    });
  });
});
