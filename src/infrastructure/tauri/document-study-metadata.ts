import { invoke } from "@tauri-apps/api/core";

export interface DocumentStudyMetadata {
  document_id: string;
  category: string;
  subcategory: string;
  description: string;
}

export async function loadDocumentStudyMetadata(
  documentId: string
): Promise<DocumentStudyMetadata | null> {
  return invoke<DocumentStudyMetadata | null>("load_document_study_metadata", {
    documentId
  });
}

export async function saveDocumentStudyMetadata(
  documentId: string,
  category: string,
  subcategory: string,
  description: string
): Promise<DocumentStudyMetadata> {
  return invoke<DocumentStudyMetadata>("save_document_study_metadata", {
    request: {
      document_id: documentId,
      category,
      subcategory,
      description
    }
  });
}
