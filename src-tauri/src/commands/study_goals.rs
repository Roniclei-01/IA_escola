use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::infrastructure::storage::{SQLiteStorage, StorageError};

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct StudyGoalResponse {
    pub document_id: Uuid,
    pub target_reviews: u32,
    pub recurrence: String,
}

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct SaveStudyGoalRequest {
    pub document_id: Uuid,
    pub target_reviews: u32,
    pub recurrence: String,
}

pub fn load_study_goal_from_storage(
    document_id: Uuid,
    storage: &SQLiteStorage,
) -> Result<Option<StudyGoalResponse>, String> {
    let goal = storage
        .load_study_goal(document_id)
        .map_err(format_load_error)?;

    Ok(goal.map(|(target_reviews, recurrence)| StudyGoalResponse {
        document_id,
        target_reviews,
        recurrence,
    }))
}

pub fn save_study_goal_with_storage(
    request: SaveStudyGoalRequest,
    storage: &SQLiteStorage,
) -> Result<StudyGoalResponse, String> {
    if request.target_reviews == 0 {
        return Err("Informe uma meta maior que zero.".to_owned());
    }

    if !is_valid_recurrence(&request.recurrence) {
        return Err("Informe uma recorrencia valida para a meta.".to_owned());
    }

    storage
        .save_study_goal(
            request.document_id,
            request.target_reviews,
            &request.recurrence,
        )
        .map_err(format_save_error)?;

    Ok(StudyGoalResponse {
        document_id: request.document_id,
        target_reviews: request.target_reviews,
        recurrence: request.recurrence,
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

fn is_valid_recurrence(recurrence: &str) -> bool {
    matches!(recurrence, "all" | "daily" | "weekly")
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
                recurrence: "weekly".to_owned(),
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
                recurrence: "weekly".to_owned(),
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
                recurrence: "daily".to_owned(),
            },
            &storage,
        );

        assert_eq!(result.unwrap_err(), "Informe uma meta maior que zero.");
    }

    #[test]
    fn rejects_invalid_study_goal_recurrence() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        let result = save_study_goal_with_storage(
            SaveStudyGoalRequest {
                document_id,
                target_reviews: 5,
                recurrence: "monthly".to_owned(),
            },
            &storage,
        );

        assert_eq!(
            result.unwrap_err(),
            "Informe uma recorrencia valida para a meta."
        );
    }
}
