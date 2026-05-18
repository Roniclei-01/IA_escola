import { invoke } from "@tauri-apps/api/core";

export interface ArchiveImportedDocumentResponse {
  document_id: string;
}

export async function archiveImportedDocument(
  documentId: string
): Promise<ArchiveImportedDocumentResponse> {
  return invoke<ArchiveImportedDocumentResponse>("archive_imported_document", {
    request: {
      document_id: documentId
    }
  });
}
