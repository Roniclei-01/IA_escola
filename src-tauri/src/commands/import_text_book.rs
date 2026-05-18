use serde::Serialize;
use uuid::Uuid;

use crate::{
    domain::{DocumentSourceType, Language},
    infrastructure::parsers::{
        parse_text_book_with_options, TextBookParserError, TextBookParserOptions,
    },
    infrastructure::storage::{SQLiteStorage, StorageError},
};

const DEFAULT_OCR_LANGUAGE: &str = "por";

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct ImportTextBookResponse {
    pub document_id: Uuid,
    pub book_id: Uuid,
    pub content: String,
    pub language: Language,
    pub source_type: DocumentSourceType,
    pub source_path: String,
}

impl From<crate::domain::Document> for ImportTextBookResponse {
    fn from(document: crate::domain::Document) -> Self {
        Self {
            document_id: document.id,
            book_id: document.book_id,
            content: document.content,
            language: document.language,
            source_type: document.source_type,
            source_path: document.source_path,
        }
    }
}

pub fn import_text_book_from_path(file_path: String) -> Result<ImportTextBookResponse, String> {
    let book_id = Uuid::new_v4();

    parse_text_book_with_options(
        book_id,
        file_path,
        Language::Pt,
        TextBookParserOptions::default(),
    )
    .map(ImportTextBookResponse::from)
    .map_err(format_parser_error)
}

pub fn import_text_book_with_storage(
    file_path: String,
    ocr_enabled: bool,
    ocr_language: Option<String>,
    storage: &SQLiteStorage,
) -> Result<ImportTextBookResponse, String> {
    let book_id = Uuid::new_v4();
    let ocr_language = normalize_ocr_language(ocr_language);
    let document = parse_text_book_with_options(
        book_id,
        file_path,
        Language::Pt,
        TextBookParserOptions {
            ocr_enabled,
            ocr_fallback_enabled: true,
            ocr_engine: crate::infrastructure::parsers::OcrEngineOptions {
                language: ocr_language,
                ..Default::default()
            },
            ..TextBookParserOptions::default()
        },
    )
    .map_err(format_parser_error)?;
    storage
        .save_document(&document)
        .map_err(format_storage_error)?;

    Ok(ImportTextBookResponse::from(document))
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub async fn import_text_book(
    app_handle: tauri::AppHandle,
    file_path: String,
    ocr_enabled: Option<bool>,
    ocr_language: Option<String>,
) -> Result<ImportTextBookResponse, String> {
    let ocr_enabled = ocr_enabled.unwrap_or(false);

    tauri::async_runtime::spawn_blocking(move || {
        let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

        import_text_book_with_storage(file_path, ocr_enabled, ocr_language, &storage)
    })
    .await
    .map_err(|_| "Nao foi possivel concluir a importacao do documento.".to_owned())?
}

fn normalize_ocr_language(ocr_language: Option<String>) -> String {
    match ocr_language.as_deref() {
        Some("eng") => "eng".to_owned(),
        Some("spa") => "spa".to_owned(),
        Some("por") | _ => DEFAULT_OCR_LANGUAGE.to_owned(),
    }
}

fn format_parser_error(error: TextBookParserError) -> String {
    match error {
        TextBookParserError::UnsupportedExtension => {
            "Apenas arquivos .txt e .pdf sao suportados.".to_owned()
        }
        TextBookParserError::FileNotFound => "Arquivo de estudo nao encontrado.".to_owned(),
        TextBookParserError::ReadFailed => "Nao foi possivel ler o arquivo de estudo.".to_owned(),
        TextBookParserError::PdfReadFailed => "Nao foi possivel extrair texto do PDF.".to_owned(),
        TextBookParserError::PdfNeedsOcr => {
            "Este PDF parece digitalizado. Ative OCR para tentar importar.".to_owned()
        }
        TextBookParserError::OcrUnavailable => {
            "OCR falhou. Verifique se pdftoppm, tesseract e o idioma OCR estao instalados."
                .to_owned()
        }
        TextBookParserError::InvalidDocument(_) => "O arquivo de estudo esta vazio.".to_owned(),
    }
}

fn format_storage_error(_error: StorageError) -> String {
    "Nao foi possivel salvar o documento importado.".to_owned()
}

#[cfg(test)]
mod tests {
    use std::{fs, path::PathBuf};

    use tempfile::TempDir;

    use super::{format_parser_error, import_text_book_with_storage, normalize_ocr_language};
    use crate::{
        domain::DocumentError, infrastructure::parsers::TextBookParserError,
        infrastructure::storage::SQLiteStorage,
    };

    fn write_temp_file(dir: &TempDir, name: &str, content: &str) -> PathBuf {
        let path = dir.path().join(name);
        fs::write(&path, content).unwrap();
        path
    }

    #[test]
    fn formats_parser_errors_for_ui() {
        assert_eq!(
            format_parser_error(TextBookParserError::UnsupportedExtension),
            "Apenas arquivos .txt e .pdf sao suportados."
        );
        assert_eq!(
            format_parser_error(TextBookParserError::FileNotFound),
            "Arquivo de estudo nao encontrado."
        );
        assert_eq!(
            format_parser_error(TextBookParserError::ReadFailed),
            "Nao foi possivel ler o arquivo de estudo."
        );
        assert_eq!(
            format_parser_error(TextBookParserError::PdfReadFailed),
            "Nao foi possivel extrair texto do PDF."
        );
        assert_eq!(
            format_parser_error(TextBookParserError::PdfNeedsOcr),
            "Este PDF parece digitalizado. Ative OCR para tentar importar."
        );
        assert_eq!(
            format_parser_error(TextBookParserError::OcrUnavailable),
            "OCR falhou. Verifique se pdftoppm, tesseract e o idioma OCR estao instalados."
        );
        assert_eq!(
            format_parser_error(TextBookParserError::InvalidDocument(
                DocumentError::EmptyContent
            )),
            "O arquivo de estudo esta vazio."
        );
    }

    #[test]
    fn imports_and_persists_text_document() {
        let dir = TempDir::new().unwrap();
        let path = write_temp_file(&dir, "book.txt", "Conteudo persistido no SQLite.");
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let response =
            import_text_book_with_storage(path.to_string_lossy().to_string(), false, None, &storage)
                .unwrap();
        let documents = storage.list_documents().unwrap();

        assert_eq!(documents.len(), 1);
        assert_eq!(documents[0].id, response.document_id);
        assert_eq!(documents[0].content, "Conteudo persistido no SQLite.");
        assert_eq!(response.source_type, crate::domain::DocumentSourceType::Txt);
        assert_eq!(response.source_path, path.to_string_lossy());
    }

    #[test]
    fn normalizes_ocr_language_for_tesseract() {
        assert_eq!(normalize_ocr_language(Some("eng".to_owned())), "eng");
        assert_eq!(normalize_ocr_language(Some("spa".to_owned())), "spa");
        assert_eq!(normalize_ocr_language(Some("invalid".to_owned())), "por");
        assert_eq!(normalize_ocr_language(None), "por");
    }
}
