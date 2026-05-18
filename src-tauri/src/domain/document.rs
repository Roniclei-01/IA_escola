use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

use super::Language;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DocumentSourceType {
    Txt,
    Pdf,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct Document {
    pub id: Uuid,
    pub book_id: Uuid,
    pub content: String,
    pub language: Language,
    pub source_type: DocumentSourceType,
    pub source_path: String,
}

#[derive(Debug, Error, Eq, PartialEq)]
pub enum DocumentError {
    #[error("document content cannot be empty")]
    EmptyContent,
}

impl Document {
    pub fn new(
        book_id: Uuid,
        content: impl Into<String>,
        language: Language,
        source_type: DocumentSourceType,
        source_path: impl Into<String>,
    ) -> Result<Self, DocumentError> {
        let content = content.into().trim().to_owned();
        let source_path = source_path.into().trim().to_owned();

        if content.is_empty() {
            return Err(DocumentError::EmptyContent);
        }

        Ok(Self {
            id: Uuid::new_v4(),
            book_id,
            content,
            language,
            source_type,
            source_path,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{Document, DocumentError, DocumentSourceType};
    use crate::domain::Language;
    use uuid::Uuid;

    #[test]
    fn creates_valid_document() {
        let document = Document::new(
            Uuid::new_v4(),
            "Conteudo para estudo",
            Language::Pt,
            DocumentSourceType::Txt,
            "/tmp/livro.txt",
        )
        .unwrap();

        assert_eq!(document.content, "Conteudo para estudo");
        assert_eq!(document.language, Language::Pt);
        assert_eq!(document.source_type, DocumentSourceType::Txt);
        assert_eq!(document.source_path, "/tmp/livro.txt");
    }

    #[test]
    fn rejects_empty_content() {
        let result = Document::new(
            Uuid::new_v4(),
            "   ",
            Language::Pt,
            DocumentSourceType::Txt,
            "/tmp/livro.txt",
        );

        assert_eq!(result.unwrap_err(), DocumentError::EmptyContent);
    }
}
