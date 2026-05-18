use std::path::Path;

use rusqlite::{params, Connection};
use thiserror::Error;
use uuid::Uuid;

use crate::domain::{Document, Language};

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("failed to open SQLite database")]
    OpenFailed(#[source] rusqlite::Error),
    #[error("failed to run SQLite migration")]
    MigrationFailed(#[source] rusqlite::Error),
    #[error("failed to save document")]
    SaveDocumentFailed(#[source] rusqlite::Error),
    #[error("failed to list documents")]
    ListDocumentsFailed(#[source] rusqlite::Error),
    #[error("stored document has invalid id")]
    InvalidDocumentId(#[source] uuid::Error),
    #[error("stored document has invalid book id")]
    InvalidBookId(#[source] uuid::Error),
    #[error("stored document has invalid language")]
    InvalidLanguage(String),
}

pub struct SQLiteStorage {
    connection: Connection,
}

impl SQLiteStorage {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, StorageError> {
        let connection = Connection::open(path).map_err(StorageError::OpenFailed)?;
        let storage = Self { connection };
        storage.migrate()?;
        Ok(storage)
    }

    pub fn open_in_memory() -> Result<Self, StorageError> {
        let connection = Connection::open_in_memory().map_err(StorageError::OpenFailed)?;
        let storage = Self { connection };
        storage.migrate()?;
        Ok(storage)
    }

    pub fn save_document(&self, document: &Document) -> Result<(), StorageError> {
        self.connection
            .execute(
                "INSERT OR REPLACE INTO documents (id, book_id, content, language)
                 VALUES (?1, ?2, ?3, ?4)",
                params![
                    document.id.to_string(),
                    document.book_id.to_string(),
                    document.content,
                    language_to_code(&document.language),
                ],
            )
            .map_err(StorageError::SaveDocumentFailed)?;

        Ok(())
    }

    pub fn list_documents(&self) -> Result<Vec<Document>, StorageError> {
        let mut statement = self
            .connection
            .prepare("SELECT id, book_id, content, language FROM documents ORDER BY created_at ASC")
            .map_err(StorageError::ListDocumentsFailed)?;

        let rows = statement
            .query_map([], |row| {
                Ok(RawDocument {
                    id: row.get(0)?,
                    book_id: row.get(1)?,
                    content: row.get(2)?,
                    language: row.get(3)?,
                })
            })
            .map_err(StorageError::ListDocumentsFailed)?;

        let mut documents = Vec::new();

        for row in rows {
            let raw_document = row.map_err(StorageError::ListDocumentsFailed)?;
            documents.push(raw_document.try_into()?);
        }

        Ok(documents)
    }

    fn migrate(&self) -> Result<(), StorageError> {
        self.connection
            .execute_batch(
                "CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY NOT NULL,
                    book_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    language TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );",
            )
            .map_err(StorageError::MigrationFailed)
    }
}

struct RawDocument {
    id: String,
    book_id: String,
    content: String,
    language: String,
}

impl TryFrom<RawDocument> for Document {
    type Error = StorageError;

    fn try_from(raw: RawDocument) -> Result<Self, Self::Error> {
        Ok(Self {
            id: Uuid::parse_str(&raw.id).map_err(StorageError::InvalidDocumentId)?,
            book_id: Uuid::parse_str(&raw.book_id).map_err(StorageError::InvalidBookId)?,
            content: raw.content,
            language: language_from_code(&raw.language)?,
        })
    }
}

fn language_to_code(language: &Language) -> &'static str {
    match language {
        Language::Pt => "pt",
        Language::En => "en",
        Language::Es => "es",
    }
}

fn language_from_code(code: &str) -> Result<Language, StorageError> {
    match code {
        "pt" => Ok(Language::Pt),
        "en" => Ok(Language::En),
        "es" => Ok(Language::Es),
        value => Err(StorageError::InvalidLanguage(value.to_owned())),
    }
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::SQLiteStorage;
    use crate::domain::{Document, Language};

    #[test]
    fn creates_documents_table_on_open() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        assert_eq!(storage.list_documents().unwrap(), Vec::<Document>::new());
    }

    #[test]
    fn saves_and_lists_documents() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let book_id = Uuid::new_v4();
        let document = Document::new(book_id, "Conteudo persistido", Language::Pt).unwrap();

        storage.save_document(&document).unwrap();

        let documents = storage.list_documents().unwrap();

        assert_eq!(documents, vec![document]);
    }

    #[test]
    fn replaces_existing_document() {
        let storage = SQLiteStorage::open_in_memory().unwrap();
        let book_id = Uuid::new_v4();
        let mut document = Document::new(book_id, "Versao inicial", Language::Pt).unwrap();

        storage.save_document(&document).unwrap();
        document.content = "Versao atualizada".to_owned();
        storage.save_document(&document).unwrap();

        let documents = storage.list_documents().unwrap();

        assert_eq!(documents.len(), 1);
        assert_eq!(documents[0].content, "Versao atualizada");
    }
}
