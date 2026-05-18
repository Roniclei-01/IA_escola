import { invoke } from "@tauri-apps/api/core";
import type { ImportTextBookResponse } from "./import-text-book";

export interface ListImportedDocumentsResponse {
  documents: ImportTextBookResponse[];
}

export async function listImportedDocuments(): Promise<ListImportedDocumentsResponse> {
  return invoke<ListImportedDocumentsResponse>("list_imported_documents");
}
