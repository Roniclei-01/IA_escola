import { invoke } from "@tauri-apps/api/core";
import type { ImportedDocumentChunk } from "./chunk-text-document";

export interface ListDocumentChunksResponse {
  chunks: ImportedDocumentChunk[];
}

export async function listDocumentChunks(documentId: string): Promise<ListDocumentChunksResponse> {
  return invoke<ListDocumentChunksResponse>("list_document_chunks", {
    documentId
  });
}
