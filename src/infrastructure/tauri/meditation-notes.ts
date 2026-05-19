import { invoke } from "@tauri-apps/api/core";

export interface MeditationNote {
  document_id: string;
  content: string;
}

export async function loadMeditationNote(documentId: string): Promise<MeditationNote> {
  return invoke<MeditationNote>("load_meditation_note", {
    documentId
  });
}

export async function saveMeditationNote(
  documentId: string,
  content: string
): Promise<MeditationNote> {
  return invoke<MeditationNote>("save_meditation_note", {
    request: {
      document_id: documentId,
      content
    }
  });
}
