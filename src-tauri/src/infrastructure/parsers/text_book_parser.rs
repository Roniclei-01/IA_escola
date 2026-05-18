use std::{fs, path::Path};

use thiserror::Error;

use crate::domain::{Document, DocumentError, Language};

#[derive(Debug, Error, Eq, PartialEq)]
pub enum TextBookParserError {
    #[error("only .txt files are supported")]
    UnsupportedExtension,
    #[error("text file does not exist")]
    FileNotFound,
    #[error("failed to read text file")]
    ReadFailed,
    #[error(transparent)]
    InvalidDocument(#[from] DocumentError),
}

pub fn parse_text_book(
    book_id: uuid::Uuid,
    file_path: impl AsRef<Path>,
    language: Language,
) -> Result<Document, TextBookParserError> {
    let path = file_path.as_ref();

    if !path.exists() {
        return Err(TextBookParserError::FileNotFound);
    }

    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase);

    if extension.as_deref() != Some("txt") {
        return Err(TextBookParserError::UnsupportedExtension);
    }

    let content = fs::read_to_string(path).map_err(|_| TextBookParserError::ReadFailed)?;

    Document::new(book_id, content, language).map_err(TextBookParserError::InvalidDocument)
}

#[cfg(test)]
mod tests {
    use std::{fs, path::PathBuf};

    use tempfile::TempDir;
    use uuid::Uuid;

    use super::{parse_text_book, TextBookParserError};
    use crate::domain::Language;

    fn write_temp_file(dir: &TempDir, name: &str, content: &str) -> PathBuf {
        let path = dir.path().join(name);
        fs::write(&path, content).unwrap();
        path
    }

    #[test]
    fn parses_txt_file_into_document() {
        let dir = TempDir::new().unwrap();
        let path = write_temp_file(&dir, "book.txt", "Conteudo importado para estudo.");
        let book_id = Uuid::new_v4();

        let document = parse_text_book(book_id, path, Language::Pt).unwrap();

        assert_eq!(document.book_id, book_id);
        assert_eq!(document.content, "Conteudo importado para estudo.");
        assert_eq!(document.language, Language::Pt);
    }

    #[test]
    fn rejects_non_txt_file() {
        let dir = TempDir::new().unwrap();
        let path = write_temp_file(&dir, "book.pdf", "conteudo");

        let result = parse_text_book(Uuid::new_v4(), path, Language::Pt);

        assert_eq!(result.unwrap_err(), TextBookParserError::UnsupportedExtension);
    }

    #[test]
    fn rejects_empty_txt_file() {
        let dir = TempDir::new().unwrap();
        let path = write_temp_file(&dir, "empty.txt", "   ");

        let result = parse_text_book(Uuid::new_v4(), path, Language::Pt);

        assert!(matches!(
            result.unwrap_err(),
            TextBookParserError::InvalidDocument(_)
        ));
    }

    #[test]
    fn rejects_missing_file() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("missing.txt");

        let result = parse_text_book(Uuid::new_v4(), path, Language::Pt);

        assert_eq!(result.unwrap_err(), TextBookParserError::FileNotFound);
    }
}
