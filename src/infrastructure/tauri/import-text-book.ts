import { invoke } from "@tauri-apps/api/core";

export interface ImportTextBookResponse {
  document_id: string;
  book_id: string;
  content: string;
  language: "Pt" | "En" | "Es";
}

export async function importTextBook(filePath: string): Promise<ImportTextBookResponse> {
  return invoke<ImportTextBookResponse>("import_text_book", {
    filePath
  });
}
