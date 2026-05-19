use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::infrastructure::storage::{SQLiteStorage, StorageError};

const PDF_READER_PAGE_PREFIX: &str = "reader.pdf.page.";
const PDF_READER_ZOOM_PREFIX: &str = "reader.pdf.zoom.";
const DEFAULT_PDF_READER_PAGE: u32 = 1;
const DEFAULT_PDF_READER_ZOOM: f32 = 1.0;
const ALLOWED_ZOOM_LEVELS: [f32; 4] = [0.85, 1.0, 1.25, 1.5];

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct PdfReaderPreference {
    pub document_id: String,
    pub page: u32,
    pub zoom: f32,
}

pub fn load_pdf_reader_preference_from_storage(
    document_id: String,
    storage: &SQLiteStorage,
) -> Result<PdfReaderPreference, String> {
    let document_id = normalize_document_id(&document_id)?;
    let page_key = page_setting_key(&document_id);
    let zoom_key = zoom_setting_key(&document_id);
    let page = storage
        .load_setting(&page_key)
        .map_err(format_load_error)?
        .and_then(|value| value.parse::<u32>().ok())
        .filter(|page| *page > 0)
        .unwrap_or(DEFAULT_PDF_READER_PAGE);
    let zoom = storage
        .load_setting(&zoom_key)
        .map_err(format_load_error)?
        .and_then(|value| value.parse::<f32>().ok())
        .filter(|zoom| is_allowed_zoom(*zoom))
        .unwrap_or(DEFAULT_PDF_READER_ZOOM);

    Ok(PdfReaderPreference {
        document_id,
        page,
        zoom,
    })
}

pub fn save_pdf_reader_preference_with_storage(
    preference: PdfReaderPreference,
    storage: &SQLiteStorage,
) -> Result<PdfReaderPreference, String> {
    let preference = normalize_preference(preference)?;

    storage
        .save_setting(&page_setting_key(&preference.document_id), &preference.page.to_string())
        .map_err(format_save_error)?;
    storage
        .save_setting(&zoom_setting_key(&preference.document_id), &preference.zoom.to_string())
        .map_err(format_save_error)?;

    Ok(preference)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn load_pdf_reader_preference(
    app_handle: tauri::AppHandle,
    document_id: String,
) -> Result<PdfReaderPreference, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    load_pdf_reader_preference_from_storage(document_id, &storage)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn save_pdf_reader_preference(
    app_handle: tauri::AppHandle,
    preference: PdfReaderPreference,
) -> Result<PdfReaderPreference, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    save_pdf_reader_preference_with_storage(preference, &storage)
}

fn normalize_preference(preference: PdfReaderPreference) -> Result<PdfReaderPreference, String> {
    let document_id = normalize_document_id(&preference.document_id)?;

    if preference.page == 0 {
        return Err("Pagina do leitor PDF invalida.".to_owned());
    }

    if !is_allowed_zoom(preference.zoom) {
        return Err("Zoom do leitor PDF invalido.".to_owned());
    }

    Ok(PdfReaderPreference {
        document_id,
        page: preference.page,
        zoom: preference.zoom,
    })
}

fn normalize_document_id(document_id: &str) -> Result<String, String> {
    let document_id = document_id.trim();

    if document_id.is_empty() {
        return Err("Informe o documento para carregar o leitor PDF.".to_owned());
    }

    Uuid::parse_str(document_id)
        .map(|uuid| uuid.to_string())
        .map_err(|_| "Documento invalido para o leitor PDF.".to_owned())
}

fn is_allowed_zoom(zoom: f32) -> bool {
    ALLOWED_ZOOM_LEVELS
        .iter()
        .any(|allowed_zoom| (zoom - allowed_zoom).abs() < f32::EPSILON)
}

fn page_setting_key(document_id: &str) -> String {
    format!("{PDF_READER_PAGE_PREFIX}{document_id}")
}

fn zoom_setting_key(document_id: &str) -> String {
    format!("{PDF_READER_ZOOM_PREFIX}{document_id}")
}

fn format_load_error(_error: StorageError) -> String {
    "Nao foi possivel carregar a posicao do leitor PDF.".to_owned()
}

fn format_save_error(_error: StorageError) -> String {
    "Nao foi possivel salvar a posicao do leitor PDF.".to_owned()
}

#[cfg(test)]
mod tests {
    use super::{
        load_pdf_reader_preference_from_storage, save_pdf_reader_preference_with_storage,
        PdfReaderPreference,
    };
    use crate::infrastructure::storage::SQLiteStorage;
    use uuid::Uuid;

    #[test]
    fn loads_default_pdf_reader_preference_when_empty() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4().to_string();

        let preference =
            load_pdf_reader_preference_from_storage(document_id.clone(), &storage).unwrap();

        assert_eq!(
            preference,
            PdfReaderPreference {
                document_id,
                page: 1,
                zoom: 1.0,
            }
        );
    }

    #[test]
    fn saves_and_loads_pdf_reader_preference() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let document_id = Uuid::new_v4().to_string();

        save_pdf_reader_preference_with_storage(
            PdfReaderPreference {
                document_id: format!(" {document_id} "),
                page: 12,
                zoom: 1.25,
            },
            &storage,
        )
        .unwrap();

        let preference =
            load_pdf_reader_preference_from_storage(document_id.clone(), &storage).unwrap();

        assert_eq!(
            preference,
            PdfReaderPreference {
                document_id,
                page: 12,
                zoom: 1.25,
            }
        );
    }

    #[test]
    fn rejects_invalid_pdf_reader_preference() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let result = save_pdf_reader_preference_with_storage(
            PdfReaderPreference {
                document_id: Uuid::new_v4().to_string(),
                page: 0,
                zoom: 1.0,
            },
            &storage,
        );

        assert_eq!(result.unwrap_err(), "Pagina do leitor PDF invalida.");

        let result = save_pdf_reader_preference_with_storage(
            PdfReaderPreference {
                document_id: Uuid::new_v4().to_string(),
                page: 1,
                zoom: 1.1,
            },
            &storage,
        );

        assert_eq!(result.unwrap_err(), "Zoom do leitor PDF invalido.");
    }
}
