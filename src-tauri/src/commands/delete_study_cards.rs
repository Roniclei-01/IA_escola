use serde::Serialize;
use uuid::Uuid;

use crate::infrastructure::storage::{SQLiteStorage, StorageError};

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct DeleteStudyCardsResponse {
    pub document_id: Uuid,
    pub deleted_cards: usize,
}

pub fn delete_study_cards_with_storage(
    storage: &mut SQLiteStorage,
    document_id: Uuid,
) -> Result<DeleteStudyCardsResponse, String> {
    let deleted_cards = storage
        .delete_study_cards_by_document(document_id)
        .map_err(format_storage_error)?;

    Ok(DeleteStudyCardsResponse {
        document_id,
        deleted_cards,
    })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn delete_study_cards(
    app_handle: tauri::AppHandle,
    document_id: Uuid,
) -> Result<DeleteStudyCardsResponse, String> {
    let mut storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    delete_study_cards_with_storage(&mut storage, document_id)
}

fn format_storage_error(_error: StorageError) -> String {
    "Nao foi possivel excluir os cards de estudo.".to_owned()
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::delete_study_cards_with_storage;
    use crate::{
        domain::{DocumentChunk, StudyCard, StudyReview, StudyReviewRating, StudySession},
        infrastructure::storage::SQLiteStorage,
    };

    #[test]
    fn deletes_cards_and_related_study_data_for_document() {
        let mut storage = SQLiteStorage::open_in_memory().unwrap();
        let book_id = Uuid::new_v4();
        let document_id = Uuid::new_v4();
        let other_document_id = Uuid::new_v4();
        let chunk = DocumentChunk::new(book_id, document_id, 1, "chunk").unwrap();
        let other_chunk = DocumentChunk::new(book_id, other_document_id, 1, "outro").unwrap();
        let card = StudyCard::new(book_id, chunk.id, "Pergunta", "Resposta", vec![]).unwrap();
        let other_card =
            StudyCard::new(book_id, other_chunk.id, "Outra", "Resposta", vec![]).unwrap();
        let session = StudySession::new(document_id).unwrap();
        let other_session = StudySession::new(other_document_id).unwrap();
        let review =
            StudyReview::new_in_session(card.id, session.id, StudyReviewRating::Easy).unwrap();

        storage.save_chunks(&[chunk, other_chunk]).unwrap();
        storage
            .save_study_cards(&[card.clone(), other_card.clone()])
            .unwrap();
        storage.save_study_session(&session).unwrap();
        storage.save_study_session(&other_session).unwrap();
        storage.save_study_review(&review).unwrap();

        let response = delete_study_cards_with_storage(&mut storage, document_id).unwrap();

        assert_eq!(response.document_id, document_id);
        assert_eq!(response.deleted_cards, 1);
        assert!(storage
            .list_study_cards_by_document(document_id)
            .unwrap()
            .is_empty());
        assert!(storage
            .list_study_reviews_by_document(document_id)
            .unwrap()
            .is_empty());
        assert!(storage
            .list_study_sessions_by_document(document_id)
            .unwrap()
            .is_empty());
        assert_eq!(
            storage
                .list_study_cards_by_document(other_document_id)
                .unwrap(),
            vec![other_card]
        );
        assert_eq!(
            storage
                .list_study_sessions_by_document(other_document_id)
                .unwrap(),
            vec![other_session]
        );
    }
}
