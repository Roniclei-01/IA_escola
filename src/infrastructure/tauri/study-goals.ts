import { invoke } from "@tauri-apps/api/core";

export interface StudyGoal {
  document_id: string;
  target_reviews: number;
  recurrence: "all" | "daily" | "weekly";
}

export async function loadStudyGoal(documentId: string): Promise<StudyGoal | null> {
  return invoke<StudyGoal | null>("load_study_goal", {
    documentId
  });
}

export async function saveStudyGoal(
  documentId: string,
  targetReviews: number,
  recurrence: StudyGoal["recurrence"]
): Promise<StudyGoal> {
  return invoke<StudyGoal>("save_study_goal", {
    request: {
      document_id: documentId,
      target_reviews: targetReviews,
      recurrence
    }
  });
}
