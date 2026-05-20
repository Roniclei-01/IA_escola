use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::infrastructure::storage::{MeditationNoteRecord, SQLiteStorage, StorageError};

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct MeditationNoteResponse {
    pub id: Uuid,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct MeditationNotesResponse {
    pub document_id: Uuid,
    pub notes: Vec<MeditationNoteResponse>,
}

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct AddMeditationNoteRequest {
    pub document_id: Uuid,
    pub content: String,
}

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct UpdateMeditationNoteRequest {
    pub document_id: Uuid,
    pub note_id: Uuid,
    pub content: String,
}

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct DeleteMeditationNoteRequest {
    pub document_id: Uuid,
    pub note_id: Uuid,
}

pub fn load_meditation_notes_from_storage(
    document_id: Uuid,
    storage: &SQLiteStorage,
) -> Result<MeditationNotesResponse, String> {
    let notes = storage
        .load_meditation_notes(document_id)
        .map_err(format_load_error)?
        .into_iter()
        .map(MeditationNoteResponse::from)
        .collect();

    Ok(MeditationNotesResponse { document_id, notes })
}

pub fn add_meditation_note_with_storage(
    request: AddMeditationNoteRequest,
    storage: &SQLiteStorage,
) -> Result<MeditationNotesResponse, String> {
    let content = request.content.trim().to_owned();

    if content.is_empty() {
        return Err(format_save_error_message());
    }

    let note = MeditationNoteRecord {
        id: Uuid::new_v4(),
        content,
        created_at: Utc::now().to_rfc3339(),
    };

    let notes = storage
        .add_meditation_note(request.document_id, note)
        .map_err(format_save_error)?
        .into_iter()
        .map(MeditationNoteResponse::from)
        .collect();

    Ok(MeditationNotesResponse {
        document_id: request.document_id,
        notes,
    })
}

pub fn update_meditation_note_with_storage(
    request: UpdateMeditationNoteRequest,
    storage: &SQLiteStorage,
) -> Result<MeditationNotesResponse, String> {
    let content = request.content.trim().to_owned();

    if content.is_empty() {
        return Err(format_save_error_message());
    }

    let mut notes = storage
        .load_meditation_notes(request.document_id)
        .map_err(format_save_error)?;
    let Some(note) = notes.iter_mut().find(|note| note.id == request.note_id) else {
        return Err(format_save_error_message());
    };

    note.content = content;
    storage
        .save_meditation_notes(request.document_id, &notes)
        .map_err(format_save_error)?;

    Ok(MeditationNotesResponse {
        document_id: request.document_id,
        notes: notes
            .into_iter()
            .map(MeditationNoteResponse::from)
            .collect(),
    })
}

pub fn delete_meditation_note_with_storage(
    request: DeleteMeditationNoteRequest,
    storage: &SQLiteStorage,
) -> Result<MeditationNotesResponse, String> {
    let mut notes = storage
        .load_meditation_notes(request.document_id)
        .map_err(format_save_error)?;
    let initial_len = notes.len();
    notes.retain(|note| note.id != request.note_id);

    if notes.len() == initial_len {
        return Err(format_save_error_message());
    }

    storage
        .save_meditation_notes(request.document_id, &notes)
        .map_err(format_save_error)?;

    Ok(MeditationNotesResponse {
        document_id: request.document_id,
        notes: notes
            .into_iter()
            .map(MeditationNoteResponse::from)
            .collect(),
    })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn load_meditation_notes(
    app_handle: tauri::AppHandle,
    document_id: Uuid,
) -> Result<MeditationNotesResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    load_meditation_notes_from_storage(document_id, &storage)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn add_meditation_note(
    app_handle: tauri::AppHandle,
    request: AddMeditationNoteRequest,
) -> Result<MeditationNotesResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    add_meditation_note_with_storage(request, &storage)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn update_meditation_note(
    app_handle: tauri::AppHandle,
    request: UpdateMeditationNoteRequest,
) -> Result<MeditationNotesResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    update_meditation_note_with_storage(request, &storage)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn delete_meditation_note(
    app_handle: tauri::AppHandle,
    request: DeleteMeditationNoteRequest,
) -> Result<MeditationNotesResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    delete_meditation_note_with_storage(request, &storage)
}

impl From<MeditationNoteRecord> for MeditationNoteResponse {
    fn from(note: MeditationNoteRecord) -> Self {
        Self {
            id: note.id,
            content: note.content,
            created_at: note.created_at,
        }
    }
}

fn format_load_error(_error: StorageError) -> String {
    "Nao foi possivel carregar a meditacao do documento.".to_owned()
}

fn format_save_error(_error: StorageError) -> String {
    format_save_error_message()
}

fn format_save_error_message() -> String {
    "Nao foi possivel salvar a meditacao do documento.".to_owned()
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{
        add_meditation_note_with_storage, delete_meditation_note_with_storage,
        load_meditation_notes_from_storage, update_meditation_note_with_storage,
        AddMeditationNoteRequest, DeleteMeditationNoteRequest, UpdateMeditationNoteRequest,
    };
    use crate::infrastructure::storage::SQLiteStorage;

    #[test]
    fn adds_and_loads_multiple_document_meditation_notes() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        let first_result = add_meditation_note_with_storage(
            AddMeditationNoteRequest {
                document_id,
                content: "  Entendi os pontos principais sobre redes.\n\n  ".to_owned(),
            },
            &storage,
        )
        .unwrap();
        let second_result = add_meditation_note_with_storage(
            AddMeditationNoteRequest {
                document_id,
                content: "Preciso revisar o capitulo de protocolos.".to_owned(),
            },
            &storage,
        )
        .unwrap();

        assert_eq!(first_result.document_id, document_id);
        assert_eq!(first_result.notes.len(), 1);
        assert_eq!(second_result.notes.len(), 2);
        assert_eq!(
            second_result.notes[0].content,
            "Entendi os pontos principais sobre redes."
        );
        assert_eq!(
            second_result.notes[1].content,
            "Preciso revisar o capitulo de protocolos."
        );
        assert_ne!(second_result.notes[0].id, second_result.notes[1].id);
        assert!(!second_result.notes[1].created_at.is_empty());

        let loaded_notes = load_meditation_notes_from_storage(document_id, &storage).unwrap();

        assert_eq!(loaded_notes.notes, second_result.notes);
    }

    #[test]
    fn returns_empty_list_when_document_has_no_meditation_notes() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        let notes = load_meditation_notes_from_storage(document_id, &storage).unwrap();

        assert_eq!(notes.document_id, document_id);
        assert!(notes.notes.is_empty());
    }

    #[test]
    fn rejects_empty_meditation_note() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        let result = add_meditation_note_with_storage(
            AddMeditationNoteRequest {
                document_id,
                content: "   ".to_owned(),
            },
            &storage,
        );

        assert_eq!(
            result.unwrap_err(),
            "Nao foi possivel salvar a meditacao do documento."
        );
    }

    #[test]
    fn updates_existing_document_meditation_note() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();
        let notes = add_meditation_note_with_storage(
            AddMeditationNoteRequest {
                document_id,
                content: "Resumo inicial.".to_owned(),
            },
            &storage,
        )
        .unwrap();
        let note_id = notes.notes[0].id;

        let updated_notes = update_meditation_note_with_storage(
            UpdateMeditationNoteRequest {
                document_id,
                note_id,
                content: "Resumo revisado.".to_owned(),
            },
            &storage,
        )
        .unwrap();

        assert_eq!(updated_notes.notes.len(), 1);
        assert_eq!(updated_notes.notes[0].id, note_id);
        assert_eq!(updated_notes.notes[0].content, "Resumo revisado.");
    }

    #[test]
    fn deletes_existing_document_meditation_note() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();
        let notes = add_meditation_note_with_storage(
            AddMeditationNoteRequest {
                document_id,
                content: "Resumo para excluir.".to_owned(),
            },
            &storage,
        )
        .unwrap();
        let note_id = notes.notes[0].id;

        let remaining_notes = delete_meditation_note_with_storage(
            DeleteMeditationNoteRequest {
                document_id,
                note_id,
            },
            &storage,
        )
        .unwrap();

        assert!(remaining_notes.notes.is_empty());
    }
}
