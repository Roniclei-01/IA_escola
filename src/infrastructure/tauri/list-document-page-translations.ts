import { invoke } from "@tauri-apps/api/core";
import type { ImportTextBookResponse } from "./import-text-book";

export interface ListDocumentPageTranslationsResponse {
  page_indexes: number[];
}

export async function listDocumentPageTranslations(
  documentId: string,
  targetLanguage: ImportTextBookResponse["language"]
): Promise<ListDocumentPageTranslationsResponse> {
  return invoke<ListDocumentPageTranslationsResponse>("list_document_page_translations", {
    request: {
      document_id: documentId,
      target_language: targetLanguage
    }
  });
}
