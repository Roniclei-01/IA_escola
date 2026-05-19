import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadDocumentStudyMetadata, saveDocumentStudyMetadata } from "./document-study-metadata";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("document study metadata bridge", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("loads document study metadata from Tauri", async () => {
    invokeMock.mockResolvedValue({
      document_id: "document-1",
      category: "Programacao",
      subcategory: "Python",
      description: "Livro para praticar fundamentos da linguagem."
    });

    const metadata = await loadDocumentStudyMetadata("document-1");

    expect(invokeMock).toHaveBeenCalledWith("load_document_study_metadata", {
      documentId: "document-1"
    });
    expect(metadata).toEqual({
      document_id: "document-1",
      category: "Programacao",
      subcategory: "Python",
      description: "Livro para praticar fundamentos da linguagem."
    });
  });

  it("saves document study metadata through Tauri", async () => {
    invokeMock.mockResolvedValue({
      document_id: "document-1",
      category: "Redes",
      subcategory: "TCP/IP",
      description: "Material de base para revisao de redes."
    });

    const metadata = await saveDocumentStudyMetadata(
      "document-1",
      "Redes",
      "TCP/IP",
      "Material de base para revisao de redes."
    );

    expect(invokeMock).toHaveBeenCalledWith("save_document_study_metadata", {
      request: {
        document_id: "document-1",
        category: "Redes",
        subcategory: "TCP/IP",
        description: "Material de base para revisao de redes."
      }
    });
    expect(metadata.category).toBe("Redes");
    expect(metadata.subcategory).toBe("TCP/IP");
  });
});
