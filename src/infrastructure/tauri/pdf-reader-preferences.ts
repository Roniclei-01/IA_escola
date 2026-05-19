import { invoke } from "@tauri-apps/api/core";

export interface PdfReaderPreference {
  document_id: string;
  page: number;
  zoom: number;
}

export async function loadPdfReaderPreference(
  documentId: string
): Promise<PdfReaderPreference> {
  return invoke<PdfReaderPreference>("load_pdf_reader_preference", {
    document_id: documentId
  });
}

export async function savePdfReaderPreference(
  preference: PdfReaderPreference
): Promise<PdfReaderPreference> {
  return invoke<PdfReaderPreference>("save_pdf_reader_preference", {
    preference
  });
}
