use serde::Serialize;
use uuid::Uuid;

use crate::{
    domain::Language,
    infrastructure::parsers::{parse_text_book, TextBookParserError},
    infrastructure::storage::{SQLiteStorage, StorageError},
};

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct ImportTextBookResponse {
    pub document_id: Uuid,
    pub book_id: Uuid,
    pub content: String,
    pub language: Language,
}

impl From<crate::domain::Document> for ImportTextBookResponse {
    fn from(document: crate::domain::Document) -> Self {
        Self {
            document_id: document.id,
            book_id: document.book_id,
            content: document.content,
            language: document.language,
        }
    }
}

pub fn import_text_book_from_path(file_path: String) -> Result<ImportTextBookResponse, String> {
    let book_id = Uuid::new_v4();

    parse_text_book(book_id, file_path, Language::Pt)
        .map(ImportTextBookResponse::from)
        .map_err(format_parser_error)
}

pub fn import_text_book_with_storage(
    file_path: String,
    storage: &SQLiteStorage,
) -> Result<ImportTextBookResponse, String> {
    let book_id = Uuid::new_v4();
    let document = parse_text_book(book_id, file_path, Language::Pt).map_err(format_parser_error)?;
    storage
        .save_document(&document)
        .map_err(format_storage_error)?;

    Ok(ImportTextBookResponse::from(document))
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn import_text_book(
    app_handle: tauri::AppHandle,
    file_path: String,
) -> Result<ImportTextBookResponse, String> {
    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;

    import_text_book_with_storage(file_path, &storage)
}

fn format_parser_error(error: TextBookParserError) -> String {
    match error {
        TextBookParserError::UnsupportedExtension => "Apenas arquivos .txt sao suportados.".to_owned(),
        TextBookParserError::FileNotFound => "Arquivo de texto nao encontrado.".to_owned(),
        TextBookParserError::ReadFailed => "Nao foi possivel ler o arquivo de texto.".to_owned(),
        TextBookParserError::InvalidDocument(_) => "O arquivo de texto esta vazio.".to_owned(),
    }
}

fn format_storage_error(error: StorageError) -> String {
    match error {
        StorageError::OpenFailed(_)
        | StorageError::MigrationFailed(_)
        | StorageError::SaveDocumentFailed(_)
        | StorageError::ListDocumentsFailed(_)
        | StorageError::InvalidDocumentId(_)
        | StorageError::InvalidBookId(_)
        | StorageError::InvalidLanguage(_) => {
            "Nao foi possivel salvar o documento importado.".to_owned()
        }
    }
}

#[cfg(test)]
mod tests {
    use std::{fs, path::PathBuf};

    use tempfile::TempDir;

    use super::{format_parser_error, import_text_book_with_storage};
    use crate::{
        domain::DocumentError,
        infrastructure::parsers::TextBookParserError,
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
            "Apenas arquivos .txt sao suportados."
        );
        assert_eq!(
            format_parser_error(TextBookParserError::FileNotFound),
            "Arquivo de texto nao encontrado."
        );
        assert_eq!(
            format_parser_error(TextBookParserError::ReadFailed),
            "Nao foi possivel ler o arquivo de texto."
        );
        assert_eq!(
            format_parser_error(TextBookParserError::InvalidDocument(DocumentError::EmptyContent)),
            "O arquivo de texto esta vazio."
        );
    }

    #[test]
    fn imports_and_persists_text_document() {
        let dir = TempDir::new().unwrap();
        let path = write_temp_file(&dir, "book.txt", "Conteudo persistido no SQLite.");
        let storage = SQLiteStorage::open_in_memory().unwrap();

        let response = import_text_book_with_storage(
            path.to_string_lossy().to_string(),
            &storage,
        )
        .unwrap();
        let documents = storage.list_documents().unwrap();

        assert_eq!(documents.len(), 1);
        assert_eq!(documents[0].id, response.document_id);
        assert_eq!(documents[0].content, "Conteudo persistido no SQLite.");
    }
}
