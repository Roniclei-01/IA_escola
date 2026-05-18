import { invoke } from "@tauri-apps/api/core";

export interface ImportTextBookResponse {
  document_id: string;
  book_id: string;
  content: string;
  language: "Pt" | "En" | "Es";
  source_type: "txt" | "pdf";
  source_path: string;
}

export interface ImportTextBookOptions {
  ocrEnabled?: boolean;
  ocrLanguage?: "por" | "eng" | "spa";
}

export async function importTextBook(
  filePath: string,
  options: ImportTextBookOptions = {}
): Promise<ImportTextBookResponse> {
  return invoke<ImportTextBookResponse>("import_text_book", {
    filePath,
    ocrEnabled: options.ocrEnabled ?? false,
    ocrLanguage: options.ocrLanguage ?? "por"
  });
}
