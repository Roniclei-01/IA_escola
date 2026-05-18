use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    domain::{StudyReview, StudyReviewRating},
    infrastructure::storage::{SQLiteStorage, StorageError},
};

#[derive(Debug, Eq, PartialEq, Deserialize)]
pub struct SaveStudyReviewRequest {
    pub card_id: Uuid,
    pub session_id: Option<Uuid>,
    pub rating: StudyReviewRating,
}

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct SaveStudyReviewResponse {
    pub review: StudyReview,
}

pub fn save_study_review_with_storage(
    request: SaveStudyReviewRequest,
    storage: &SQLiteStorage,
) -> Result<SaveStudyReviewResponse, String> {
    let review = match request.session_id {
        Some(session_id) => StudyReview::new_in_session(request.card_id, session_id, request.rating),
        None => StudyReview::new(request.card_id, request.rating),
    }
    .map_err(|_| format_review_error())?;

    storage
        .save_study_review(&review)
        .map_err(format_storage_error)?;

    Ok(SaveStudyReviewResponse { review })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn save_study_review(
    app_handle: tauri::AppHandle,
    request: SaveStudyReviewRequest,
) -> Result<SaveStudyReviewResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    save_study_review_with_storage(request, &storage)
}

fn format_review_error() -> String {
    "A revisao do card esta invalida.".to_owned()
}

fn format_storage_error(_error: StorageError) -> String {
    "Nao foi possivel salvar a revisao do card.".to_owned()
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{save_study_review_with_storage, SaveStudyReviewRequest};
    use crate::{
        domain::{DocumentChunk, StudyCard, StudyReviewRating},
        infrastructure::storage::SQLiteStorage,
    };

    #[test]
    fn saves_study_review() {
        let mut storage = SQLiteStorage::open_in_memory().unwrap();
        let book_id = Uuid::new_v4();
        let document_id = Uuid::new_v4();
        let chunk = DocumentChunk::new(book_id, document_id, 1, "chunk").unwrap();
        let card = StudyCard::new(book_id, chunk.id, "Pergunta", "Resposta", vec![]).unwrap();

        storage.save_chunks(&[chunk]).unwrap();
        storage.save_study_cards(&[card.clone()]).unwrap();

        let response = save_study_review_with_storage(
            SaveStudyReviewRequest {
                card_id: card.id,
                session_id: None,
                rating: StudyReviewRating::Hard,
            },
            &storage,
        )
        .unwrap();

        assert_eq!(response.review.card_id, card.id);
        assert_eq!(response.review.rating, StudyReviewRating::Hard);
        assert_eq!(response.review.priority, 70);
        assert!(response.review.next_review_at > 0);
        assert_eq!(
            storage.list_study_reviews_by_document(document_id).unwrap(),
            vec![response.review]
        );
    }
}
