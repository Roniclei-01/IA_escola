use std::{collections::HashSet, path::Path};

use rusqlite::{params, Connection};
use thiserror::Error;
use uuid::Uuid;

use crate::domain::{Document, DocumentChunk, Language, StudyCard};

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
    #[error("failed to save document chunks")]
    SaveChunksFailed(#[source] rusqlite::Error),
    #[error("failed to list document chunks")]
    ListChunksFailed(#[source] rusqlite::Error),
    #[error("failed to save study cards")]
    SaveStudyCardsFailed(#[source] rusqlite::Error),
    #[error("failed to list study cards")]
    ListStudyCardsFailed(#[source] rusqlite::Error),
    #[error("stored document has invalid id")]
    InvalidDocumentId(#[source] uuid::Error),
    #[error("stored document has invalid book id")]
    InvalidBookId(#[source] uuid::Error),
    #[error("stored chunk has invalid id")]
    InvalidChunkId(#[source] uuid::Error),
    #[error("stored chunk has invalid document id")]
    InvalidChunkDocumentId(#[source] uuid::Error),
    #[error("stored chunk position is invalid")]
    InvalidChunkPosition(i64),
    #[error("stored chunk token estimate is invalid")]
    InvalidChunkTokenEstimate(i64),
    #[error("stored study card has invalid id")]
    InvalidStudyCardId(#[source] uuid::Error),
    #[error("stored study card has invalid chunk id")]
    InvalidStudyCardChunkId(#[source] uuid::Error),
    #[error("stored study card has invalid tags")]
    InvalidStudyCardTags(#[source] serde_json::Error),
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

    pub fn save_chunks(&mut self, chunks: &[DocumentChunk]) -> Result<(), StorageError> {
        let transaction = self
            .connection
            .transaction()
            .map_err(StorageError::SaveChunksFailed)?;

        let document_ids = chunks
            .iter()
            .map(|chunk| chunk.document_id)
            .collect::<HashSet<_>>();

        for document_id in document_ids {
            transaction
                .execute(
                    "DELETE FROM document_chunks WHERE document_id = ?1",
                    [document_id.to_string()],
                )
                .map_err(StorageError::SaveChunksFailed)?;
        }

        for chunk in chunks {
            transaction
                .execute(
                    "INSERT OR REPLACE INTO document_chunks
                        (id, book_id, document_id, position, content, token_estimate)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![
                        chunk.id.to_string(),
                        chunk.book_id.to_string(),
                        chunk.document_id.to_string(),
                        chunk.position,
                        chunk.content,
                        chunk.token_estimate,
                    ],
                )
                .map_err(StorageError::SaveChunksFailed)?;
        }

        transaction
            .commit()
            .map_err(StorageError::SaveChunksFailed)?;

        Ok(())
    }

    pub fn list_chunks_by_document(
        &self,
        document_id: Uuid,
    ) -> Result<Vec<DocumentChunk>, StorageError> {
        let mut statement = self
            .connection
            .prepare(
                "SELECT id, book_id, document_id, position, content, token_estimate
                 FROM document_chunks
                 WHERE document_id = ?1
                 ORDER BY position ASC",
            )
            .map_err(StorageError::ListChunksFailed)?;

        let rows = statement
            .query_map([document_id.to_string()], |row| {
                Ok(RawDocumentChunk {
                    id: row.get(0)?,
                    book_id: row.get(1)?,
                    document_id: row.get(2)?,
                    position: row.get(3)?,
                    content: row.get(4)?,
                    token_estimate: row.get(5)?,
                })
            })
            .map_err(StorageError::ListChunksFailed)?;

        let mut chunks = Vec::new();

        for row in rows {
            let raw_chunk = row.map_err(StorageError::ListChunksFailed)?;
            chunks.push(raw_chunk.try_into()?);
        }

        Ok(chunks)
    }

    pub fn save_study_cards(&mut self, cards: &[StudyCard]) -> Result<(), StorageError> {
        let transaction = self
            .connection
            .transaction()
            .map_err(StorageError::SaveStudyCardsFailed)?;

        let chunk_ids = cards
            .iter()
            .map(|card| card.chunk_id)
            .collect::<HashSet<_>>();

        for chunk_id in chunk_ids {
            transaction
                .execute(
                    "DELETE FROM study_cards WHERE chunk_id = ?1",
                    [chunk_id.to_string()],
                )
                .map_err(StorageError::SaveStudyCardsFailed)?;
        }

        for card in cards {
            let tags =
                serde_json::to_string(&card.tags).map_err(StorageError::InvalidStudyCardTags)?;

            transaction
                .execute(
                    "INSERT OR REPLACE INTO study_cards
                        (id, book_id, chunk_id, front, back, tags)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![
                        card.id.to_string(),
                        card.book_id.to_string(),
                        card.chunk_id.to_string(),
                        card.front,
                        card.back,
                        tags,
                    ],
                )
                .map_err(StorageError::SaveStudyCardsFailed)?;
        }

        transaction
            .commit()
            .map_err(StorageError::SaveStudyCardsFailed)?;

        Ok(())
    }

    pub fn list_study_cards_by_document(
        &self,
        document_id: Uuid,
    ) -> Result<Vec<StudyCard>, StorageError> {
        let mut statement = self
            .connection
            .prepare(
                "SELECT study_cards.id,
                        study_cards.book_id,
                        study_cards.chunk_id,
                        study_cards.front,
                        study_cards.back,
                        study_cards.tags
                 FROM study_cards
                 INNER JOIN document_chunks ON document_chunks.id = study_cards.chunk_id
                 WHERE document_chunks.document_id = ?1
                 ORDER BY document_chunks.position ASC, study_cards.created_at ASC",
            )
            .map_err(StorageError::ListStudyCardsFailed)?;

        let rows = statement
            .query_map([document_id.to_string()], |row| {
                Ok(RawStudyCard {
                    id: row.get(0)?,
                    book_id: row.get(1)?,
                    chunk_id: row.get(2)?,
                    front: row.get(3)?,
                    back: row.get(4)?,
                    tags: row.get(5)?,
                })
            })
            .map_err(StorageError::ListStudyCardsFailed)?;

        let mut cards = Vec::new();

        for row in rows {
            let raw_card = row.map_err(StorageError::ListStudyCardsFailed)?;
            cards.push(raw_card.try_into()?);
        }

        Ok(cards)
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
                );

                CREATE TABLE IF NOT EXISTS document_chunks (
                    id TEXT PRIMARY KEY NOT NULL,
                    book_id TEXT NOT NULL,
                    document_id TEXT NOT NULL,
                    position INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    token_estimate INTEGER NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS study_cards (
                    id TEXT PRIMARY KEY NOT NULL,
                    book_id TEXT NOT NULL,
                    chunk_id TEXT NOT NULL,
                    front TEXT NOT NULL,
                    back TEXT NOT NULL,
                    tags TEXT NOT NULL,
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

struct RawDocumentChunk {
    id: String,
    book_id: String,
    document_id: String,
    position: i64,
    content: String,
    token_estimate: i64,
}

struct RawStudyCard {
    id: String,
    book_id: String,
    chunk_id: String,
    front: String,
    back: String,
    tags: String,
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

impl TryFrom<RawDocumentChunk> for DocumentChunk {
    type Error = StorageError;

    fn try_from(raw: RawDocumentChunk) -> Result<Self, Self::Error> {
        let position = u32::try_from(raw.position)
            .map_err(|_| StorageError::InvalidChunkPosition(raw.position))?;
        let token_estimate = u32::try_from(raw.token_estimate)
            .map_err(|_| StorageError::InvalidChunkTokenEstimate(raw.token_estimate))?;

        Ok(Self {
            id: Uuid::parse_str(&raw.id).map_err(StorageError::InvalidChunkId)?,
            book_id: Uuid::parse_str(&raw.book_id).map_err(StorageError::InvalidBookId)?,
            document_id: Uuid::parse_str(&raw.document_id)
                .map_err(StorageError::InvalidChunkDocumentId)?,
            position,
            content: raw.content,
            token_estimate,
        })
    }
}

impl TryFrom<RawStudyCard> for StudyCard {
    type Error = StorageError;

    fn try_from(raw: RawStudyCard) -> Result<Self, Self::Error> {
        Ok(Self {
            id: Uuid::parse_str(&raw.id).map_err(StorageError::InvalidStudyCardId)?,
            book_id: Uuid::parse_str(&raw.book_id).map_err(StorageError::InvalidBookId)?,
            chunk_id: Uuid::parse_str(&raw.chunk_id)
                .map_err(StorageError::InvalidStudyCardChunkId)?,
            front: raw.front,
            back: raw.back,
            tags: serde_json::from_str(&raw.tags).map_err(StorageError::InvalidStudyCardTags)?,
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
    use crate::domain::{Document, DocumentChunk, Language, StudyCard};

    #[test]
    fn creates_documents_table_on_open() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        assert_eq!(storage.list_documents().unwrap(), Vec::<Document>::new());
    }

    #[test]
    fn creates_document_chunks_table_on_open() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        assert_eq!(
            storage.list_chunks_by_document(Uuid::new_v4()).unwrap(),
            Vec::<DocumentChunk>::new()
        );
    }

    #[test]
    fn creates_study_cards_table_on_open() {
        let storage = SQLiteStorage::open_in_memory().unwrap();

        assert_eq!(
            storage
                .list_study_cards_by_document(Uuid::new_v4())
                .unwrap(),
            Vec::<StudyCard>::new()
        );
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

    #[test]
    fn saves_and_lists_chunks_ordered_by_position() {
        let mut storage = SQLiteStorage::open_in_memory().unwrap();
        let book_id = Uuid::new_v4();
        let document_id = Uuid::new_v4();
        let second_chunk = DocumentChunk::new(book_id, document_id, 2, "segundo trecho").unwrap();
        let first_chunk = DocumentChunk::new(book_id, document_id, 1, "primeiro trecho").unwrap();

        storage
            .save_chunks(&[second_chunk.clone(), first_chunk.clone()])
            .unwrap();

        let chunks = storage.list_chunks_by_document(document_id).unwrap();

        assert_eq!(chunks, vec![first_chunk, second_chunk]);
    }

    #[test]
    fn lists_only_chunks_from_requested_document() {
        let mut storage = SQLiteStorage::open_in_memory().unwrap();
        let book_id = Uuid::new_v4();
        let document_id = Uuid::new_v4();
        let other_document_id = Uuid::new_v4();
        let chunk = DocumentChunk::new(book_id, document_id, 1, "trecho principal").unwrap();
        let other_chunk =
            DocumentChunk::new(book_id, other_document_id, 1, "trecho de outro documento").unwrap();

        storage.save_chunks(&[chunk.clone(), other_chunk]).unwrap();

        let chunks = storage.list_chunks_by_document(document_id).unwrap();

        assert_eq!(chunks, vec![chunk]);
    }

    #[test]
    fn replaces_existing_chunk() {
        let mut storage = SQLiteStorage::open_in_memory().unwrap();
        let book_id = Uuid::new_v4();
        let document_id = Uuid::new_v4();
        let mut chunk = DocumentChunk::new(book_id, document_id, 1, "versao inicial").unwrap();

        storage.save_chunks(&[chunk.clone()]).unwrap();
        chunk.content = "versao atualizada".to_owned();
        chunk.token_estimate = 2;
        storage.save_chunks(&[chunk.clone()]).unwrap();

        let chunks = storage.list_chunks_by_document(document_id).unwrap();

        assert_eq!(chunks, vec![chunk]);
    }

    #[test]
    fn replaces_chunk_set_for_document() {
        let mut storage = SQLiteStorage::open_in_memory().unwrap();
        let book_id = Uuid::new_v4();
        let document_id = Uuid::new_v4();
        let first_chunk = DocumentChunk::new(book_id, document_id, 1, "primeiro").unwrap();
        let second_chunk = DocumentChunk::new(book_id, document_id, 2, "segundo").unwrap();
        let replacement_chunk =
            DocumentChunk::new(book_id, document_id, 1, "novo primeiro").unwrap();

        storage.save_chunks(&[first_chunk, second_chunk]).unwrap();
        storage.save_chunks(&[replacement_chunk.clone()]).unwrap();

        let chunks = storage.list_chunks_by_document(document_id).unwrap();

        assert_eq!(chunks, vec![replacement_chunk]);
    }

    #[test]
    fn saves_and_lists_study_cards_by_document() {
        let mut storage = SQLiteStorage::open_in_memory().unwrap();
        let book_id = Uuid::new_v4();
        let document_id = Uuid::new_v4();
        let first_chunk = DocumentChunk::new(book_id, document_id, 1, "primeiro chunk").unwrap();
        let second_chunk = DocumentChunk::new(book_id, document_id, 2, "segundo chunk").unwrap();
        let first_card = StudyCard::new(
            book_id,
            first_chunk.id,
            "Pergunta 1",
            "Resposta 1",
            vec!["mock".to_owned()],
        )
        .unwrap();
        let second_card = StudyCard::new(
            book_id,
            second_chunk.id,
            "Pergunta 2",
            "Resposta 2",
            vec!["mock".to_owned()],
        )
        .unwrap();

        storage
            .save_chunks(&[second_chunk.clone(), first_chunk.clone()])
            .unwrap();
        storage
            .save_study_cards(&[second_card.clone(), first_card.clone()])
            .unwrap();

        let cards = storage.list_study_cards_by_document(document_id).unwrap();

        assert_eq!(cards, vec![first_card, second_card]);
    }

    #[test]
    fn replaces_study_card_set_for_chunk() {
        let mut storage = SQLiteStorage::open_in_memory().unwrap();
        let book_id = Uuid::new_v4();
        let document_id = Uuid::new_v4();
        let chunk = DocumentChunk::new(book_id, document_id, 1, "chunk").unwrap();
        let first_card = StudyCard::new(
            book_id,
            chunk.id,
            "Pergunta inicial",
            "Resposta inicial",
            vec!["old".to_owned()],
        )
        .unwrap();
        let replacement_card = StudyCard::new(
            book_id,
            chunk.id,
            "Pergunta nova",
            "Resposta nova",
            vec!["new".to_owned()],
        )
        .unwrap();

        storage.save_chunks(&[chunk]).unwrap();
        storage.save_study_cards(&[first_card]).unwrap();
        storage
            .save_study_cards(&[replacement_card.clone()])
            .unwrap();

        let cards = storage.list_study_cards_by_document(document_id).unwrap();

        assert_eq!(cards, vec![replacement_card]);
    }
}
