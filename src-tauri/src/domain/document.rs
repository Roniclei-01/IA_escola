use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

use super::Language;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct Document {
    pub id: Uuid,
    pub book_id: Uuid,
    pub content: String,
    pub language: Language,
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
    ) -> Result<Self, DocumentError> {
        let content = content.into().trim().to_owned();

        if content.is_empty() {
            return Err(DocumentError::EmptyContent);
        }

        Ok(Self {
            id: Uuid::new_v4(),
            book_id,
            content,
            language,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{Document, DocumentError};
    use crate::domain::Language;
    use uuid::Uuid;

    #[test]
    fn creates_valid_document() {
        let document = Document::new(Uuid::new_v4(), "Conteudo para estudo", Language::Pt).unwrap();

        assert_eq!(document.content, "Conteudo para estudo");
        assert_eq!(document.language, Language::Pt);
    }

    #[test]
    fn rejects_empty_content() {
        let result = Document::new(Uuid::new_v4(), "   ", Language::Pt);

        assert_eq!(result.unwrap_err(), DocumentError::EmptyContent);
    }
}
