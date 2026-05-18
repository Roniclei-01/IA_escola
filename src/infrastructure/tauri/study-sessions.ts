import { invoke } from "@tauri-apps/api/core";

export interface StudySession {
  id: string;
  document_id: string;
  started_at: number;
}

export interface StudySessionSummary {
  session_id: string;
  document_id: string;
  started_at: number;
  again_count: number;
  hard_count: number;
  easy_count: number;
}

export interface StartStudySessionResponse {
  session: StudySession;
}

export interface ListStudySessionSummariesResponse {
  summaries: StudySessionSummary[];
}

export async function startStudySession(documentId: string): Promise<StudySession> {
  const response = await invoke<StartStudySessionResponse>("start_study_session", {
    request: {
      document_id: documentId
    }
  });

  return response.session;
}

export async function listStudySessionSummaries(
  documentId: string
): Promise<StudySessionSummary[]> {
  const response = await invoke<ListStudySessionSummariesResponse>("list_study_session_summaries", {
    documentId
  });

  return response.summaries;
}
