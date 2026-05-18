use serde::Serialize;
use uuid::Uuid;

use crate::{
    domain::StudyCard,
    infrastructure::storage::{SQLiteStorage, StorageError},
};

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct ListStudyCardsResponse {
    pub cards: Vec<StudyCard>,
}

pub fn list_study_cards_from_storage(
    storage: &SQLiteStorage,
    document_id: Uuid,
) -> Result<ListStudyCardsResponse, String> {
    storage
        .list_study_cards_by_document(document_id)
        .map(|cards| ListStudyCardsResponse { cards })
        .map_err(format_storage_error)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn list_study_cards(
    app_handle: tauri::AppHandle,
    document_id: Uuid,
) -> Result<ListStudyCardsResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    list_study_cards_from_storage(&storage, document_id)
}

fn format_storage_error(_error: StorageError) -> String {
    "Nao foi possivel acessar os cards salvos.".to_owned()
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::list_study_cards_from_storage;
    use crate::{
        domain::{DocumentChunk, StudyCard},
        infrastructure::storage::SQLiteStorage,
    };

    #[test]
    fn lists_persisted_cards_for_document() {
        let mut storage = SQLiteStorage::open_in_memory().unwrap();
        let book_id = Uuid::new_v4();
        let document_id = Uuid::new_v4();
        let chunk = DocumentChunk::new(book_id, document_id, 1, "chunk").unwrap();
        let card = StudyCard::new(book_id, chunk.id, "Pergunta", "Resposta", vec![]).unwrap();

        storage.save_chunks(&[chunk]).unwrap();
        storage.save_study_cards(&[card.clone()]).unwrap();

        let response = list_study_cards_from_storage(&storage, document_id).unwrap();

        assert_eq!(response.cards, vec![card]);
    }
}
