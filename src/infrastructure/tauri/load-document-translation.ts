import { invoke } from "@tauri-apps/api/core";
import type { ImportTextBookResponse } from "./import-text-book";
import type { TranslateDocumentResponse } from "./translate-document";

export interface LoadDocumentTranslationResponse {
  translation: TranslateDocumentResponse | null;
}

export async function loadDocumentTranslation(
  documentId: string,
  targetLanguage: ImportTextBookResponse["language"],
  pageIndex?: number
): Promise<LoadDocumentTranslationResponse> {
  return invoke<LoadDocumentTranslationResponse>("load_document_translation", {
    request: {
      document_id: documentId,
      target_language: targetLanguage,
      ...(pageIndex === undefined ? {} : { page_index: pageIndex })
    }
  });
}
