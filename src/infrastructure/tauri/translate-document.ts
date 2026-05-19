import { invoke } from "@tauri-apps/api/core";
import type { ImportTextBookResponse } from "./import-text-book";

export interface TranslateDocumentRequest {
  document_id: string;
  content: string;
  source_language: ImportTextBookResponse["language"];
  target_language: ImportTextBookResponse["language"];
}

export interface TranslateDocumentResponse {
  document_id: string;
  source_language: ImportTextBookResponse["language"];
  target_language: ImportTextBookResponse["language"];
  translated_content: string;
}

export async function translateDocument(
  request: TranslateDocumentRequest
): Promise<TranslateDocumentResponse> {
  return invoke<TranslateDocumentResponse>("translate_document", { request });
}
