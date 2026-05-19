use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::infrastructure::storage::{DocumentStudyMetadataRecord, SQLiteStorage, StorageError};

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct DocumentStudyMetadataResponse {
    pub document_id: Uuid,
    pub category: String,
    pub subcategory: String,
    pub description: String,
}

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct SaveDocumentStudyMetadataRequest {
    pub document_id: Uuid,
    pub category: String,
    pub subcategory: String,
    pub description: String,
}

pub fn load_document_study_metadata_from_storage(
    document_id: Uuid,
    storage: &SQLiteStorage,
) -> Result<Option<DocumentStudyMetadataResponse>, String> {
    let metadata = storage
        .load_document_study_metadata(document_id)
        .map_err(format_load_error)?;

    Ok(metadata.map(|metadata| DocumentStudyMetadataResponse {
        document_id,
        category: metadata.category,
        subcategory: metadata.subcategory,
        description: metadata.description,
    }))
}

pub fn save_document_study_metadata_with_storage(
    request: SaveDocumentStudyMetadataRequest,
    storage: &SQLiteStorage,
) -> Result<DocumentStudyMetadataResponse, String> {
    let category = request.category.trim().to_owned();
    let subcategory = request.subcategory.trim().to_owned();
    let description = request.description.trim().to_owned();

    if category.is_empty() {
        return Err("Informe a categoria de estudo.".to_owned());
    }

    if subcategory.is_empty() {
        return Err("Informe a subcategoria de estudo.".to_owned());
    }

    if description.is_empty() {
        return Err("Informe a descricao da classificacao.".to_owned());
    }

    storage
        .save_document_study_metadata(
            request.document_id,
            &DocumentStudyMetadataRecord {
                category: category.clone(),
                subcategory: subcategory.clone(),
                description: description.clone(),
            },
        )
        .map_err(format_save_error)?;

    Ok(DocumentStudyMetadataResponse {
        document_id: request.document_id,
        category,
        subcategory,
        description,
    })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn load_document_study_metadata(
    app_handle: tauri::AppHandle,
    document_id: Uuid,
) -> Result<Option<DocumentStudyMetadataResponse>, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    load_document_study_metadata_from_storage(document_id, &storage)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn save_document_study_metadata(
    app_handle: tauri::AppHandle,
    request: SaveDocumentStudyMetadataRequest,
) -> Result<DocumentStudyMetadataResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    save_document_study_metadata_with_storage(request, &storage)
}

fn format_load_error(_error: StorageError) -> String {
    "Nao foi possivel carregar a classificacao de estudo.".to_owned()
}

fn format_save_error(_error: StorageError) -> String {
    "Nao foi possivel salvar a classificacao de estudo.".to_owned()
}

#[cfg(test)]
mod tests {
    use super::{
        load_document_study_metadata_from_storage, save_document_study_metadata_with_storage,
        SaveDocumentStudyMetadataRequest,
    };
    use crate::infrastructure::storage::SQLiteStorage;
    use uuid::Uuid;

    #[test]
    fn saves_and_loads_document_study_metadata() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        let saved_metadata = save_document_study_metadata_with_storage(
            SaveDocumentStudyMetadataRequest {
                document_id,
                category: " Programacao ".to_owned(),
                subcategory: " Python ".to_owned(),
                description: " Livro base para praticar a linguagem. ".to_owned(),
            },
            &storage,
        )
        .unwrap();

        assert_eq!(saved_metadata.category, "Programacao");
        assert_eq!(saved_metadata.subcategory, "Python");
        assert_eq!(
            saved_metadata.description,
            "Livro base para praticar a linguagem."
        );

        let loaded_metadata = load_document_study_metadata_from_storage(document_id, &storage)
            .unwrap()
            .unwrap();

        assert_eq!(loaded_metadata, saved_metadata);
    }

    #[test]
    fn returns_none_when_document_has_no_study_metadata() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        let metadata = load_document_study_metadata_from_storage(document_id, &storage).unwrap();

        assert_eq!(metadata, None);
    }

    #[test]
    fn rejects_empty_category() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        let result = save_document_study_metadata_with_storage(
            SaveDocumentStudyMetadataRequest {
                document_id,
                category: " ".to_owned(),
                subcategory: "Python".to_owned(),
                description: "Descricao".to_owned(),
            },
            &storage,
        );

        assert_eq!(result.unwrap_err(), "Informe a categoria de estudo.");
    }

    #[test]
    fn rejects_empty_subcategory() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        let result = save_document_study_metadata_with_storage(
            SaveDocumentStudyMetadataRequest {
                document_id,
                category: "Programacao".to_owned(),
                subcategory: " ".to_owned(),
                description: "Descricao".to_owned(),
            },
            &storage,
        );

        assert_eq!(result.unwrap_err(), "Informe a subcategoria de estudo.");
    }

    #[test]
    fn rejects_empty_description() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4();

        let result = save_document_study_metadata_with_storage(
            SaveDocumentStudyMetadataRequest {
                document_id,
                category: "Programacao".to_owned(),
                subcategory: "Python".to_owned(),
                description: " ".to_owned(),
            },
            &storage,
        );

        assert_eq!(result.unwrap_err(), "Informe a descricao da classificacao.");
    }
}
