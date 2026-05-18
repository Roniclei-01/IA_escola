use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct DocumentChunk {
    pub id: Uuid,
    pub book_id: Uuid,
    pub document_id: Uuid,
    pub position: u32,
    pub content: String,
    pub token_estimate: u32,
}

#[derive(Debug, Error, Eq, PartialEq)]
pub enum ChunkError {
    #[error("chunk content cannot be empty")]
    EmptyContent,
}

impl DocumentChunk {
    pub fn new(
        book_id: Uuid,
        document_id: Uuid,
        position: u32,
        content: impl Into<String>,
    ) -> Result<Self, ChunkError> {
        let content = content.into().trim().to_owned();

        if content.is_empty() {
            return Err(ChunkError::EmptyContent);
        }

        Ok(Self {
            id: Uuid::new_v4(),
            book_id,
            document_id,
            position,
            token_estimate: estimate_tokens(&content),
            content,
        })
    }
}

fn estimate_tokens(content: &str) -> u32 {
    let words = content.split_whitespace().count() as u32;
    words.max(1)
}

#[cfg(test)]
mod tests {
    use super::{ChunkError, DocumentChunk};
    use uuid::Uuid;

    #[test]
    fn creates_valid_chunk_with_token_estimate() {
        let chunk = DocumentChunk::new(
            Uuid::new_v4(),
            Uuid::new_v4(),
            1,
            "Um pequeno trecho de estudo",
        )
        .unwrap();

        assert_eq!(chunk.position, 1);
        assert_eq!(chunk.token_estimate, 5);
    }

    #[test]
    fn rejects_empty_content() {
        let result = DocumentChunk::new(Uuid::new_v4(), Uuid::new_v4(), 1, "   ");

        assert_eq!(result.unwrap_err(), ChunkError::EmptyContent);
    }
}
