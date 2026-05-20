import { invoke } from "@tauri-apps/api/core";
import type { ImportTextBookResponse } from "./import-text-book";

export type TranslationProviderId = "unknown" | "libretranslate" | "ollama" | "mixed";

export interface TranslateDocumentRequest {
  document_id: string;
  content: string;
  source_language: ImportTextBookResponse["language"];
  target_language: ImportTextBookResponse["language"];
  persist?: boolean;
  page_index?: number;
}

export interface TranslateDocumentResponse {
  document_id: string;
  source_language: ImportTextBookResponse["language"];
  target_language: ImportTextBookResponse["language"];
  translated_content: string;
  page_index?: number;
  translation_provider: TranslationProviderId;
}

export async function translateDocument(
  request: TranslateDocumentRequest
): Promise<TranslateDocumentResponse> {
  return invoke<TranslateDocumentResponse>("translate_document", { request });
}
