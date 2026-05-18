import { invoke } from "@tauri-apps/api/core";
import type { ImportTextBookResponse } from "./import-text-book";

export interface ChunkTextDocumentRequest {
  document_id: string;
  book_id: string;
  content: string;
  language: "Pt" | "En" | "Es";
  max_words_per_chunk: number;
}

export interface ImportedDocumentChunk {
  id: string;
  book_id: string;
  document_id: string;
  position: number;
  content: string;
  token_estimate: number;
}

export interface ChunkTextDocumentResponse {
  chunks: ImportedDocumentChunk[];
}

export function toChunkRequest(
  document: ImportTextBookResponse,
  maxWordsPerChunk: number
): ChunkTextDocumentRequest {
  return {
    document_id: document.document_id,
    book_id: document.book_id,
    content: document.content,
    language: document.language,
    max_words_per_chunk: maxWordsPerChunk
  };
}

export async function chunkTextDocument(
  request: ChunkTextDocumentRequest
): Promise<ChunkTextDocumentResponse> {
  return invoke<ChunkTextDocumentResponse>("chunk_text_document", {
    request
  });
}
