use serde::Serialize;
use uuid::Uuid;

use crate::{
    domain::Language,
    infrastructure::parsers::{parse_text_book, TextBookParserError},
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

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn import_text_book(file_path: String) -> Result<ImportTextBookResponse, String> {
    import_text_book_from_path(file_path)
}

fn format_parser_error(error: TextBookParserError) -> String {
    match error {
        TextBookParserError::UnsupportedExtension => "Apenas arquivos .txt sao suportados.".to_owned(),
        TextBookParserError::FileNotFound => "Arquivo de texto nao encontrado.".to_owned(),
        TextBookParserError::ReadFailed => "Nao foi possivel ler o arquivo de texto.".to_owned(),
        TextBookParserError::InvalidDocument(_) => "O arquivo de texto esta vazio.".to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::format_parser_error;
    use crate::{
        domain::DocumentError,
        infrastructure::parsers::TextBookParserError,
    };

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
}
