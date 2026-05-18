import { invoke } from "@tauri-apps/api/core";

export type StudyReviewRating = "again" | "hard" | "easy";

export interface StudyReview {
  id: string;
  card_id: string;
  session_id: string | null;
  rating: StudyReviewRating;
  priority: number;
  next_review_at: number;
}

export interface SaveStudyReviewResponse {
  review: StudyReview;
}

export interface ListStudyReviewsResponse {
  reviews: StudyReview[];
}

export async function saveStudyReview(
  cardId: string,
  rating: StudyReviewRating,
  sessionId: string | null = null
): Promise<StudyReview> {
  const response = await invoke<SaveStudyReviewResponse>("save_study_review", {
    request: {
      card_id: cardId,
      session_id: sessionId,
      rating
    }
  });

  return response.review;
}

export async function listStudyReviews(documentId: string): Promise<StudyReview[]> {
  const response = await invoke<ListStudyReviewsResponse>("list_study_reviews", {
    documentId
  });

  return response.reviews;
}
