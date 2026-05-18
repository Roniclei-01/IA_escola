use serde::Serialize;

use crate::{
    domain::StudyCard,
    infrastructure::storage::{SQLiteStorage, StorageError},
};

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct SaveStudyCardsResponse {
    pub cards: Vec<StudyCard>,
}

pub fn save_study_cards_with_storage(
    cards: Vec<StudyCard>,
    storage: &mut SQLiteStorage,
) -> Result<SaveStudyCardsResponse, String> {
    storage
        .save_study_cards(&cards)
        .map_err(format_storage_error)?;

    Ok(SaveStudyCardsResponse { cards })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn save_study_cards(
    app_handle: tauri::AppHandle,
    cards: Vec<StudyCard>,
) -> Result<SaveStudyCardsResponse, String> {
    let mut storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    save_study_cards_with_storage(cards, &mut storage)
}

fn format_storage_error(_error: StorageError) -> String {
    "Nao foi possivel salvar os cards de estudo.".to_owned()
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::save_study_cards_with_storage;
    use crate::{
        domain::{DocumentChunk, StudyCard},
        infrastructure::storage::SQLiteStorage,
    };

    #[test]
    fn saves_study_cards() {
        let mut storage = SQLiteStorage::open_in_memory().unwrap();
        let book_id = Uuid::new_v4();
        let document_id = Uuid::new_v4();
        let chunk = DocumentChunk::new(book_id, document_id, 1, "chunk").unwrap();
        let card = StudyCard::new(
            book_id,
            chunk.id,
            "Pergunta",
            "Resposta",
            vec!["mock".to_owned()],
        )
        .unwrap();

        storage.save_chunks(&[chunk]).unwrap();
        let response = save_study_cards_with_storage(vec![card.clone()], &mut storage).unwrap();

        assert_eq!(response.cards, vec![card.clone()]);
        assert_eq!(
            storage.list_study_cards_by_document(document_id).unwrap(),
            vec![card]
        );
    }
}
