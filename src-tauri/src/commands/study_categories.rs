use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::infrastructure::storage::{SQLiteStorage, StorageError, StudyCategoryRecord};

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct StudyCategoryResponse {
    pub id: Uuid,
    pub name: String,
    pub subcategories: Vec<String>,
    pub archived: bool,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct ListStudyCategoriesResponse {
    pub categories: Vec<StudyCategoryResponse>,
}

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct SaveStudyCategoryRequest {
    pub id: Option<Uuid>,
    pub name: String,
    pub subcategories: Vec<String>,
}

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct DeleteStudyCategoryRequest {
    pub id: Uuid,
}

pub fn list_study_categories_from_storage(
    storage: &SQLiteStorage,
    include_archived: bool,
) -> Result<Vec<StudyCategoryResponse>, String> {
    storage
        .list_study_categories(include_archived)
        .map_err(format_list_error)
        .map(|categories| categories.into_iter().map(StudyCategoryResponse::from).collect())
}

pub fn save_study_category_with_storage(
    request: SaveStudyCategoryRequest,
    storage: &SQLiteStorage,
) -> Result<StudyCategoryResponse, String> {
    let name = request.name.trim().to_owned();
    let subcategories = normalize_subcategories(&request.subcategories)?;

    if name.is_empty() {
        return Err("Informe o nome da categoria.".to_owned());
    }

    let existing_category = match request.id {
        Some(id) => storage
            .load_study_category(id)
            .map_err(format_list_error)?,
        None => None,
    };
    let category = StudyCategoryRecord {
        id: request.id.unwrap_or_else(Uuid::new_v4),
        name,
        subcategories,
        archived: existing_category
            .as_ref()
            .map(|category| category.archived)
            .unwrap_or(false),
    };

    storage
        .save_study_category(&category)
        .map_err(format_save_error)?;

    Ok(category.into())
}

pub fn archive_study_category_with_storage(
    request: DeleteStudyCategoryRequest,
    storage: &SQLiteStorage,
) -> Result<StudyCategoryResponse, String> {
    set_category_archived(request.id, true, storage)
}

pub fn restore_study_category_with_storage(
    request: DeleteStudyCategoryRequest,
    storage: &SQLiteStorage,
) -> Result<StudyCategoryResponse, String> {
    set_category_archived(request.id, false, storage)
}

pub fn delete_study_category_with_storage(
    request: DeleteStudyCategoryRequest,
    storage: &SQLiteStorage,
) -> Result<StudyCategoryResponse, String> {
    let category = storage
        .load_study_category(request.id)
        .map_err(format_list_error)?
        .ok_or_else(|| "Categoria nao encontrada.".to_owned())?;

    if storage
        .is_study_category_in_use(&category.name)
        .map_err(format_list_error)?
    {
        return Err("Nao e possivel excluir uma categoria usada por documentos.".to_owned());
    }

    storage
        .delete_study_category(request.id)
        .map_err(format_delete_error)?;

    Ok(category.into())
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn list_study_categories(
    app_handle: tauri::AppHandle,
    include_archived: Option<bool>,
) -> Result<ListStudyCategoriesResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;
    let categories =
        list_study_categories_from_storage(&storage, include_archived.unwrap_or(false))?;

    Ok(ListStudyCategoriesResponse { categories })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn save_study_category(
    app_handle: tauri::AppHandle,
    request: SaveStudyCategoryRequest,
) -> Result<StudyCategoryResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    save_study_category_with_storage(request, &storage)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn archive_study_category(
    app_handle: tauri::AppHandle,
    request: DeleteStudyCategoryRequest,
) -> Result<StudyCategoryResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    archive_study_category_with_storage(request, &storage)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn restore_study_category(
    app_handle: tauri::AppHandle,
    request: DeleteStudyCategoryRequest,
) -> Result<StudyCategoryResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    restore_study_category_with_storage(request, &storage)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn delete_study_category(
    app_handle: tauri::AppHandle,
    request: DeleteStudyCategoryRequest,
) -> Result<StudyCategoryResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    delete_study_category_with_storage(request, &storage)
}

impl From<StudyCategoryRecord> for StudyCategoryResponse {
    fn from(category: StudyCategoryRecord) -> Self {
        Self {
            id: category.id,
            name: category.name,
            subcategories: category.subcategories,
            archived: category.archived,
        }
    }
}

fn normalize_subcategories(subcategories: &[String]) -> Result<Vec<String>, String> {
    let mut seen_subcategories = HashSet::new();
    let mut normalized_subcategories = Vec::new();

    for subcategory in subcategories {
        let normalized_subcategory = subcategory.trim();

        if normalized_subcategory.is_empty() {
            continue;
        }

        if seen_subcategories.insert(normalized_subcategory.to_lowercase()) {
            normalized_subcategories.push(normalized_subcategory.to_owned());
        }
    }

    if normalized_subcategories.is_empty() {
        return Err("Informe pelo menos uma subcategoria.".to_owned());
    }

    Ok(normalized_subcategories)
}

fn set_category_archived(
    category_id: Uuid,
    archived: bool,
    storage: &SQLiteStorage,
) -> Result<StudyCategoryResponse, String> {
    storage
        .set_study_category_archived(category_id, archived)
        .map_err(format_save_error)?;
    let category = storage
        .load_study_category(category_id)
        .map_err(format_list_error)?
        .ok_or_else(|| "Categoria nao encontrada.".to_owned())?;

    Ok(category.into())
}

fn format_list_error(_error: StorageError) -> String {
    "Nao foi possivel carregar as categorias de estudo.".to_owned()
}

fn format_save_error(_error: StorageError) -> String {
    "Nao foi possivel salvar a categoria de estudo.".to_owned()
}

fn format_delete_error(_error: StorageError) -> String {
    "Nao foi possivel excluir a categoria de estudo.".to_owned()
}

#[cfg(test)]
mod tests {
    use super::{
        archive_study_category_with_storage, delete_study_category_with_storage,
        list_study_categories_from_storage, restore_study_category_with_storage,
        save_study_category_with_storage, DeleteStudyCategoryRequest, SaveStudyCategoryRequest,
    };
    use crate::infrastructure::storage::{DocumentStudyMetadataRecord, SQLiteStorage};
    use uuid::Uuid;

    #[test]
    fn saves_and_lists_study_categories() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let saved_category = save_study_category_with_storage(
            SaveStudyCategoryRequest {
                id: None,
                name: " Tecnologia ".to_owned(),
                subcategories: vec![
                    " Redes ".to_owned(),
                    "Seguranca".to_owned(),
                    "Redes".to_owned(),
                ],
            },
            &storage,
        )
        .unwrap();

        assert_eq!(saved_category.name, "Tecnologia");
        assert_eq!(saved_category.subcategories, vec!["Redes", "Seguranca"]);
        assert!(!saved_category.archived);

        let categories = list_study_categories_from_storage(&storage, false).unwrap();

        assert_eq!(categories, vec![saved_category]);
    }

    #[test]
    fn rejects_empty_category_name() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let result = save_study_category_with_storage(
            SaveStudyCategoryRequest {
                id: None,
                name: " ".to_owned(),
                subcategories: vec!["Geral".to_owned()],
            },
            &storage,
        );

        assert_eq!(result.unwrap_err(), "Informe o nome da categoria.");
    }

    #[test]
    fn rejects_empty_subcategory_list() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let result = save_study_category_with_storage(
            SaveStudyCategoryRequest {
                id: None,
                name: "Tecnologia".to_owned(),
                subcategories: vec![" ".to_owned()],
            },
            &storage,
        );

        assert_eq!(
            result.unwrap_err(),
            "Informe pelo menos uma subcategoria."
        );
    }

    #[test]
    fn archives_and_restores_study_category() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let category = save_study_category_with_storage(
            SaveStudyCategoryRequest {
                id: None,
                name: "Tecnologia".to_owned(),
                subcategories: vec!["Redes".to_owned()],
            },
            &storage,
        )
        .unwrap();

        let archived =
            archive_study_category_with_storage(DeleteStudyCategoryRequest { id: category.id }, &storage)
                .unwrap();

        assert!(archived.archived);
        assert!(list_study_categories_from_storage(&storage, false)
            .unwrap()
            .is_empty());

        let restored =
            restore_study_category_with_storage(DeleteStudyCategoryRequest { id: category.id }, &storage)
                .unwrap();

        assert!(!restored.archived);
        assert_eq!(
            list_study_categories_from_storage(&storage, false).unwrap(),
            vec![restored]
        );
    }

    #[test]
    fn prevents_deleting_category_used_by_document_metadata() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();
        let category = save_study_category_with_storage(
            SaveStudyCategoryRequest {
                id: None,
                name: "Tecnologia".to_owned(),
                subcategories: vec!["Redes".to_owned()],
            },
            &storage,
        )
        .unwrap();
        storage
            .save_document_study_metadata(
                document_id,
                &DocumentStudyMetadataRecord {
                    category: "Tecnologia".to_owned(),
                    subcategory: "Redes".to_owned(),
                    description: "Documento vinculado.".to_owned(),
                },
            )
            .unwrap();

        let result =
            delete_study_category_with_storage(DeleteStudyCategoryRequest { id: category.id }, &storage);

        assert_eq!(
            result.unwrap_err(),
            "Nao e possivel excluir uma categoria usada por documentos."
        );
    }
}
