use thiserror::Error;

use crate::domain::{ChunkError, Document, DocumentChunk};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ChunkDocumentConfig {
    pub max_words_per_chunk: usize,
}

impl Default for ChunkDocumentConfig {
    fn default() -> Self {
        Self {
            max_words_per_chunk: 180,
        }
    }
}

#[derive(Debug, Error, Eq, PartialEq)]
pub enum ChunkDocumentError {
    #[error("max words per chunk must be greater than zero")]
    InvalidChunkSize,
    #[error(transparent)]
    InvalidChunk(#[from] ChunkError),
}

pub fn chunk_document(
    document: &Document,
    config: ChunkDocumentConfig,
) -> Result<Vec<DocumentChunk>, ChunkDocumentError> {
    if config.max_words_per_chunk == 0 {
        return Err(ChunkDocumentError::InvalidChunkSize);
    }

    let words = document.content.split_whitespace().collect::<Vec<_>>();
    let mut chunks = Vec::new();

    for (index, word_group) in words.chunks(config.max_words_per_chunk).enumerate() {
        let content = word_group.join(" ");
        chunks.push(DocumentChunk::new(
            document.book_id,
            document.id,
            index as u32,
            content,
        )?);
    }

    Ok(chunks)
}

#[cfg(test)]
mod tests {
    use super::{chunk_document, ChunkDocumentConfig, ChunkDocumentError};
    use crate::domain::{Document, DocumentSourceType, Language};
    use uuid::Uuid;

    #[test]
    fn splits_document_into_ordered_chunks() {
        let document = Document::new(
            Uuid::new_v4(),
            "um dois tres quatro cinco seis sete",
            Language::Pt,
            DocumentSourceType::Txt,
            "/tmp/livro.txt",
        )
        .unwrap();

        let chunks = chunk_document(
            &document,
            ChunkDocumentConfig {
                max_words_per_chunk: 3,
            },
        )
        .unwrap();

        assert_eq!(chunks.len(), 3);
        assert_eq!(chunks[0].position, 0);
        assert_eq!(chunks[0].content, "um dois tres");
        assert_eq!(chunks[1].position, 1);
        assert_eq!(chunks[1].content, "quatro cinco seis");
        assert_eq!(chunks[2].position, 2);
        assert_eq!(chunks[2].content, "sete");
    }

    #[test]
    fn rejects_zero_chunk_size() {
        let document = Document::new(
            Uuid::new_v4(),
            "conteudo",
            Language::Pt,
            DocumentSourceType::Txt,
            "/tmp/livro.txt",
        )
        .unwrap();
        let result = chunk_document(
            &document,
            ChunkDocumentConfig {
                max_words_per_chunk: 0,
            },
        );

        assert_eq!(result.unwrap_err(), ChunkDocumentError::InvalidChunkSize);
    }
}
