import { invoke } from "@tauri-apps/api/core";
import type { ImportTextBookResponse } from "./import-text-book";

export interface ListArchivedDocumentsResponse {
  documents: ImportTextBookResponse[];
}

export interface RestoreImportedDocumentResponse {
  document_id: string;
}

export interface DeleteImportedDocumentResponse {
  document_id: string;
}

export async function listArchivedDocuments(): Promise<ListArchivedDocumentsResponse> {
  return invoke<ListArchivedDocumentsResponse>("list_archived_documents");
}

export async function restoreImportedDocument(
  documentId: string
): Promise<RestoreImportedDocumentResponse> {
  return invoke<RestoreImportedDocumentResponse>("restore_imported_document", {
    request: {
      document_id: documentId
    }
  });
}

export async function deleteImportedDocument(
  documentId: string
): Promise<DeleteImportedDocumentResponse> {
  return invoke<DeleteImportedDocumentResponse>("delete_imported_document", {
    request: {
      document_id: documentId
    }
  });
}
