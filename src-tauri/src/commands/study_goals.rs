use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::infrastructure::storage::{SQLiteStorage, StorageError};

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct StudyGoalResponse {
    pub document_id: Uuid,
    pub target_reviews: u32,
}

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct SaveStudyGoalRequest {
    pub document_id: Uuid,
    pub target_reviews: u32,
}

pub fn load_study_goal_from_storage(
    document_id: Uuid,
    storage: &SQLiteStorage,
) -> Result<Option<StudyGoalResponse>, String> {
    let target_reviews = storage
        .load_study_goal(document_id)
        .map_err(format_load_error)?;

    Ok(target_reviews.map(|target_reviews| StudyGoalResponse {
        document_id,
        target_reviews,
    }))
}

pub fn save_study_goal_with_storage(
    request: SaveStudyGoalRequest,
    storage: &SQLiteStorage,
) -> Result<StudyGoalResponse, String> {
    if request.target_reviews == 0 {
        return Err("Informe uma meta maior que zero.".to_owned());
    }

    storage
        .save_study_goal(request.document_id, request.target_reviews)
        .map_err(format_save_error)?;

    Ok(StudyGoalResponse {
        document_id: request.document_id,
        target_reviews: request.target_reviews,
    })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn load_study_goal(
    app_handle: tauri::AppHandle,
    document_id: Uuid,
) -> Result<Option<StudyGoalResponse>, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    load_study_goal_from_storage(document_id, &storage)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn save_study_goal(
    app_handle: tauri::AppHandle,
    request: SaveStudyGoalRequest,
) -> Result<StudyGoalResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    save_study_goal_with_storage(request, &storage)
}

fn format_load_error(_error: StorageError) -> String {
    "Nao foi possivel carregar a meta de estudo.".to_owned()
}

fn format_save_error(_error: StorageError) -> String {
    "Nao foi possivel salvar a meta de estudo.".to_owned()
}

#[cfg(test)]
mod tests {
    use super::{
        load_study_goal_from_storage, save_study_goal_with_storage, SaveStudyGoalRequest,
        StudyGoalResponse,
    };
    use crate::infrastructure::storage::SQLiteStorage;
    use uuid::Uuid;

    #[test]
    fn saves_and_loads_document_study_goal() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        save_study_goal_with_storage(
            SaveStudyGoalRequest {
                document_id,
                target_reviews: 10,
            },
            &storage,
        )
        .unwrap();

        let goal = load_study_goal_from_storage(document_id, &storage).unwrap();

        assert_eq!(
            goal,
            Some(StudyGoalResponse {
                document_id,
                target_reviews: 10,
            })
        );
    }

    #[test]
    fn returns_none_when_document_has_no_study_goal() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        let goal = load_study_goal_from_storage(document_id, &storage).unwrap();

        assert_eq!(goal, None);
    }

    #[test]
    fn rejects_zero_study_goal() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        let result = save_study_goal_with_storage(
            SaveStudyGoalRequest {
                document_id,
                target_reviews: 0,
            },
            &storage,
        );

        assert_eq!(result.unwrap_err(), "Informe uma meta maior que zero.");
    }
}
