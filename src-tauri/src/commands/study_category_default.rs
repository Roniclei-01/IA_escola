use serde::{Deserialize, Serialize};

use crate::infrastructure::storage::{SQLiteStorage, StorageError};

const DEFAULT_STUDY_CATEGORY_KEY: &str = "study_category_default.category";
const DEFAULT_STUDY_SUBCATEGORY_KEY: &str = "study_category_default.subcategory";
const DEFAULT_STUDY_CATEGORY: &str = "Geral";
const DEFAULT_STUDY_SUBCATEGORY: &str = "Sem subcategoria";

#[derive(Debug, Clone, Eq, PartialEq, Deserialize, Serialize)]
pub struct StudyCategoryDefault {
    pub category: String,
    pub subcategory: String,
}

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct StudyCategoryDefaultRequest {
    pub category: String,
    pub subcategory: String,
}

pub fn default_study_category_default() -> StudyCategoryDefault {
    StudyCategoryDefault {
        category: DEFAULT_STUDY_CATEGORY.to_owned(),
        subcategory: DEFAULT_STUDY_SUBCATEGORY.to_owned(),
    }
}

pub fn load_study_category_default_from_storage(
    storage: &SQLiteStorage,
) -> Result<StudyCategoryDefault, String> {
    let defaults = default_study_category_default();
    let category = storage
        .load_setting(DEFAULT_STUDY_CATEGORY_KEY)
        .map_err(format_load_error)?
        .map(normalize_optional_value)
        .filter(|value| !value.is_empty())
        .unwrap_or(defaults.category);
    let subcategory = storage
        .load_setting(DEFAULT_STUDY_SUBCATEGORY_KEY)
        .map_err(format_load_error)?
        .map(normalize_optional_value)
        .filter(|value| !value.is_empty())
        .unwrap_or(defaults.subcategory);

    Ok(StudyCategoryDefault {
        category,
        subcategory,
    })
}

pub fn save_study_category_default_with_storage(
    request: StudyCategoryDefaultRequest,
    storage: &SQLiteStorage,
) -> Result<StudyCategoryDefault, String> {
    let settings = normalize_request(request)?;

    storage
        .save_setting(DEFAULT_STUDY_CATEGORY_KEY, &settings.category)
        .map_err(format_save_error)?;
    storage
        .save_setting(DEFAULT_STUDY_SUBCATEGORY_KEY, &settings.subcategory)
        .map_err(format_save_error)?;

    Ok(settings)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn load_study_category_default(
    app_handle: tauri::AppHandle,
) -> Result<StudyCategoryDefault, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    load_study_category_default_from_storage(&storage)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn save_study_category_default(
    app_handle: tauri::AppHandle,
    request: StudyCategoryDefaultRequest,
) -> Result<StudyCategoryDefault, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    save_study_category_default_with_storage(request, &storage)
}

fn normalize_request(request: StudyCategoryDefaultRequest) -> Result<StudyCategoryDefault, String> {
    let category = request.category.trim().to_owned();
    let subcategory = request.subcategory.trim().to_owned();

    if category.is_empty() {
        return Err("Informe a categoria padrao.".to_owned());
    }

    if subcategory.is_empty() {
        return Err("Informe a subcategoria padrao.".to_owned());
    }

    Ok(StudyCategoryDefault {
        category,
        subcategory,
    })
}

fn normalize_optional_value(value: String) -> String {
    value.trim().to_owned()
}

fn format_load_error(_error: StorageError) -> String {
    "Nao foi possivel carregar a categoria padrao.".to_owned()
}

fn format_save_error(_error: StorageError) -> String {
    "Nao foi possivel salvar a categoria padrao.".to_owned()
}

#[cfg(test)]
mod tests {
    use super::{
        load_study_category_default_from_storage, save_study_category_default_with_storage,
        StudyCategoryDefault, StudyCategoryDefaultRequest,
    };
    use crate::infrastructure::storage::SQLiteStorage;

    #[test]
    fn loads_default_category_when_empty() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let settings = load_study_category_default_from_storage(&storage).unwrap();

        assert_eq!(
            settings,
            StudyCategoryDefault {
                category: "Geral".to_owned(),
                subcategory: "Sem subcategoria".to_owned(),
            }
        );
    }

    #[test]
    fn saves_and_loads_default_category() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        save_study_category_default_with_storage(
            StudyCategoryDefaultRequest {
                category: " Tecnologia e Computacao ".to_owned(),
                subcategory: " Redes de computadores ".to_owned(),
            },
            &storage,
        )
        .unwrap();

        let settings = load_study_category_default_from_storage(&storage).unwrap();

        assert_eq!(
            settings,
            StudyCategoryDefault {
                category: "Tecnologia e Computacao".to_owned(),
                subcategory: "Redes de computadores".to_owned(),
            }
        );
    }

    #[test]
    fn rejects_empty_default_category() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let result = save_study_category_default_with_storage(
            StudyCategoryDefaultRequest {
                category: " ".to_owned(),
                subcategory: "Pentest".to_owned(),
            },
            &storage,
        );

        assert_eq!(result, Err("Informe a categoria padrao.".to_owned()));
    }

    #[test]
    fn rejects_empty_default_subcategory() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let result = save_study_category_default_with_storage(
            StudyCategoryDefaultRequest {
                category: "Ciberseguranca".to_owned(),
                subcategory: " ".to_owned(),
            },
            &storage,
        );

        assert_eq!(result, Err("Informe a subcategoria padrao.".to_owned()));
    }
}
