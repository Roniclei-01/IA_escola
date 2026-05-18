use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub enum Language {
    Pt,
    En,
    Es,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct Book {
    pub id: Uuid,
    pub title: String,
    pub author: Option<String>,
    pub language: Language,
    pub source_path: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Error, Eq, PartialEq)]
pub enum BookError {
    #[error("book title cannot be empty")]
    EmptyTitle,
    #[error("book source path cannot be empty")]
    EmptySourcePath,
}

impl Book {
    pub fn new(
        title: impl Into<String>,
        author: Option<String>,
        language: Language,
        source_path: impl Into<String>,
    ) -> Result<Self, BookError> {
        let title = title.into().trim().to_owned();
        let source_path = source_path.into().trim().to_owned();

        if title.is_empty() {
            return Err(BookError::EmptyTitle);
        }

        if source_path.is_empty() {
            return Err(BookError::EmptySourcePath);
        }

        Ok(Self {
            id: Uuid::new_v4(),
            title,
            author,
            language,
            source_path,
            created_at: Utc::now(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{Book, BookError, Language};

    #[test]
    fn creates_valid_book() {
        let book = Book::new("Livro de teste", None, Language::Pt, "/tmp/livro.txt").unwrap();

        assert_eq!(book.title, "Livro de teste");
        assert_eq!(book.language, Language::Pt);
        assert_eq!(book.source_path, "/tmp/livro.txt");
    }

    #[test]
    fn rejects_empty_title() {
        let result = Book::new("   ", None, Language::Pt, "/tmp/livro.txt");

        assert_eq!(result.unwrap_err(), BookError::EmptyTitle);
    }

    #[test]
    fn rejects_empty_source_path() {
        let result = Book::new("Livro", None, Language::Pt, "   ");

        assert_eq!(result.unwrap_err(), BookError::EmptySourcePath);
    }
}
