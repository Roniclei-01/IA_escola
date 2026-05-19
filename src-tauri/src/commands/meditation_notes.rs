use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::infrastructure::storage::{SQLiteStorage, StorageError};

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct MeditationNoteResponse {
    pub document_id: Uuid,
    pub content: String,
}

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct SaveMeditationNoteRequest {
    pub document_id: Uuid,
    pub content: String,
}

pub fn load_meditation_note_from_storage(
    document_id: Uuid,
    storage: &SQLiteStorage,
) -> Result<MeditationNoteResponse, String> {
    let content = storage
        .load_meditation_note(document_id)
        .map_err(format_load_error)?
        .unwrap_or_default();

    Ok(MeditationNoteResponse {
        document_id,
        content,
    })
}

pub fn save_meditation_note_with_storage(
    request: SaveMeditationNoteRequest,
    storage: &SQLiteStorage,
) -> Result<MeditationNoteResponse, String> {
    let content = request.content.trim().to_owned();

    storage
        .save_meditation_note(request.document_id, &content)
        .map_err(format_save_error)?;

    Ok(MeditationNoteResponse {
        document_id: request.document_id,
        content,
    })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn load_meditation_note(
    app_handle: tauri::AppHandle,
    document_id: Uuid,
) -> Result<MeditationNoteResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    load_meditation_note_from_storage(document_id, &storage)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn save_meditation_note(
    app_handle: tauri::AppHandle,
    request: SaveMeditationNoteRequest,
) -> Result<MeditationNoteResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    save_meditation_note_with_storage(request, &storage)
}

fn format_load_error(_error: StorageError) -> String {
    "Nao foi possivel carregar a meditacao do documento.".to_owned()
}

fn format_save_error(_error: StorageError) -> String {
    "Nao foi possivel salvar a meditacao do documento.".to_owned()
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{
        load_meditation_note_from_storage, save_meditation_note_with_storage,
        SaveMeditationNoteRequest,
    };
    use crate::infrastructure::storage::SQLiteStorage;

    #[test]
    fn saves_and_loads_document_meditation_note() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        let saved_note = save_meditation_note_with_storage(
            SaveMeditationNoteRequest {
                document_id,
                content: "  Entendi os pontos principais sobre redes.\n\n  ".to_owned(),
            },
            &storage,
        )
        .unwrap();

        assert_eq!(saved_note.document_id, document_id);
        assert_eq!(
            saved_note.content,
            "Entendi os pontos principais sobre redes."
        );
        assert_eq!(
            load_meditation_note_from_storage(document_id, &storage)
                .unwrap()
                .content,
            "Entendi os pontos principais sobre redes."
        );
    }

    #[test]
    fn returns_empty_note_when_document_has_no_meditation_note() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        let note = load_meditation_note_from_storage(document_id, &storage).unwrap();

        assert_eq!(note.document_id, document_id);
        assert_eq!(note.content, "");
    }
}
