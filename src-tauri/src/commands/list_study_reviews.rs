use serde::Serialize;
use uuid::Uuid;

use crate::{
    domain::StudyReview,
    infrastructure::storage::{SQLiteStorage, StorageError},
};

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct ListStudyReviewsResponse {
    pub reviews: Vec<StudyReview>,
}

pub fn list_study_reviews_from_storage(
    document_id: Uuid,
    storage: &SQLiteStorage,
) -> Result<ListStudyReviewsResponse, String> {
    let reviews = storage
        .list_study_reviews_by_document(document_id)
        .map_err(format_storage_error)?;

    Ok(ListStudyReviewsResponse { reviews })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn list_study_reviews(
    app_handle: tauri::AppHandle,
    document_id: Uuid,
) -> Result<ListStudyReviewsResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    list_study_reviews_from_storage(document_id, &storage)
}

fn format_storage_error(_error: StorageError) -> String {
    "Nao foi possivel carregar as revisoes dos cards.".to_owned()
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::list_study_reviews_from_storage;
    use crate::{
        domain::{DocumentChunk, StudyCard, StudyReview, StudyReviewRating},
        infrastructure::storage::SQLiteStorage,
    };

    #[test]
    fn lists_persisted_reviews_for_document() {
        let mut storage = SQLiteStorage::open_in_memory().unwrap();
        let book_id = Uuid::new_v4();
        let document_id = Uuid::new_v4();
        let chunk = DocumentChunk::new(book_id, document_id, 1, "chunk").unwrap();
        let card = StudyCard::new(book_id, chunk.id, "Pergunta", "Resposta", vec![]).unwrap();
        let review = StudyReview::new(card.id, StudyReviewRating::Easy).unwrap();

        storage.save_chunks(&[chunk]).unwrap();
        storage.save_study_cards(&[card]).unwrap();
        storage.save_study_review(&review).unwrap();

        let response = list_study_reviews_from_storage(document_id, &storage).unwrap();

        assert_eq!(response.reviews, vec![review]);
        assert_eq!(response.reviews[0].priority, 20);
        assert!(response.reviews[0].next_review_at > 0);
    }
}
