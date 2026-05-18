use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    domain::StudySession,
    infrastructure::storage::{SQLiteStorage, StorageError},
};

#[derive(Debug, Eq, PartialEq, Deserialize)]
pub struct StartStudySessionRequest {
    pub document_id: Uuid,
}

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct StartStudySessionResponse {
    pub session: StudySession,
}

pub fn start_study_session_with_storage(
    request: StartStudySessionRequest,
    storage: &SQLiteStorage,
) -> Result<StartStudySessionResponse, String> {
    let session =
        StudySession::new(request.document_id).map_err(|_| format_study_session_error())?;

    storage
        .save_study_session(&session)
        .map_err(format_storage_error)?;

    Ok(StartStudySessionResponse { session })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn start_study_session(
    app_handle: tauri::AppHandle,
    request: StartStudySessionRequest,
) -> Result<StartStudySessionResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    start_study_session_with_storage(request, &storage)
}

fn format_study_session_error() -> String {
    "A sessao de estudo esta invalida.".to_owned()
}

fn format_storage_error(_error: StorageError) -> String {
    "Nao foi possivel iniciar a sessao de estudo.".to_owned()
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{start_study_session_with_storage, StartStudySessionRequest};
    use crate::infrastructure::storage::SQLiteStorage;

    #[test]
    fn starts_study_session() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        let response = start_study_session_with_storage(
            StartStudySessionRequest { document_id },
            &storage,
        )
        .unwrap();

        assert_eq!(response.session.document_id, document_id);
        assert!(response.session.started_at > 0);
        assert_eq!(
            storage.list_study_sessions_by_document(document_id).unwrap(),
            vec![response.session]
        );
    }
}
