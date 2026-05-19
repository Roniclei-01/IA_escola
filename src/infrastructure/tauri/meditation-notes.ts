import { invoke } from "@tauri-apps/api/core";

export interface MeditationNote {
  id: string;
  content: string;
  created_at: string;
}

export interface MeditationNotesResponse {
  document_id: string;
  notes: MeditationNote[];
}

export async function loadMeditationNotes(documentId: string): Promise<MeditationNotesResponse> {
  return invoke<MeditationNotesResponse>("load_meditation_notes", {
    documentId
  });
}

export async function addMeditationNote(
  documentId: string,
  content: string
): Promise<MeditationNotesResponse> {
  return invoke<MeditationNotesResponse>("add_meditation_note", {
    request: {
      document_id: documentId,
      content
    }
  });
}

export async function updateMeditationNote(
  documentId: string,
  noteId: string,
  content: string
): Promise<MeditationNotesResponse> {
  return invoke<MeditationNotesResponse>("update_meditation_note", {
    request: {
      document_id: documentId,
      note_id: noteId,
      content
    }
  });
}

export async function deleteMeditationNote(
  documentId: string,
  noteId: string
): Promise<MeditationNotesResponse> {
  return invoke<MeditationNotesResponse>("delete_meditation_note", {
    request: {
      document_id: documentId,
      note_id: noteId
    }
  });
}
