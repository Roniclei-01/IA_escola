use serde::Serialize;
use uuid::Uuid;

use crate::{
    domain::StudySessionSummary,
    infrastructure::storage::{SQLiteStorage, StorageError},
};

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct ListStudySessionSummariesResponse {
    pub summaries: Vec<StudySessionSummary>,
}

pub fn list_study_session_summaries_from_storage(
    document_id: Uuid,
    storage: &SQLiteStorage,
) -> Result<ListStudySessionSummariesResponse, String> {
    let summaries = storage
        .list_study_session_summaries_by_document(document_id)
        .map_err(format_storage_error)?;

    Ok(ListStudySessionSummariesResponse { summaries })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn list_study_session_summaries(
    app_handle: tauri::AppHandle,
    document_id: Uuid,
) -> Result<ListStudySessionSummariesResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    list_study_session_summaries_from_storage(document_id, &storage)
}

fn format_storage_error(_error: StorageError) -> String {
    "Nao foi possivel carregar o resumo das sessoes de estudo.".to_owned()
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::list_study_session_summaries_from_storage;
    use crate::{
        domain::{DocumentChunk, StudyCard, StudyReview, StudyReviewRating, StudySession},
        infrastructure::storage::SQLiteStorage,
    };

    #[test]
    fn lists_session_summaries_for_document() {
        let mut storage = SQLiteStorage::open_in_memory().unwrap();
        let book_id = Uuid::new_v4();
        let document_id = Uuid::new_v4();
        let chunk = DocumentChunk::new(book_id, document_id, 1, "chunk").unwrap();
        let card = StudyCard::new(book_id, chunk.id, "Pergunta", "Resposta", vec![]).unwrap();
        let session = StudySession::new(document_id).unwrap();
        let review =
            StudyReview::new_in_session(card.id, session.id, StudyReviewRating::Again).unwrap();

        storage.save_chunks(&[chunk]).unwrap();
        storage.save_study_cards(&[card]).unwrap();
        storage.save_study_session(&session).unwrap();
        storage.save_study_review(&review).unwrap();

        let response = list_study_session_summaries_from_storage(document_id, &storage).unwrap();

        assert_eq!(response.summaries.len(), 1);
        assert_eq!(response.summaries[0].again_count, 1);
        assert_eq!(response.summaries[0].hard_count, 0);
        assert_eq!(response.summaries[0].easy_count, 0);
    }
}
