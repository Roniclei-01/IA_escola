use thiserror::Error;

use crate::{
    app::{FlashcardConfig, ModelAdapter, ModelAdapterError},
    domain::{DocumentChunk, StudyCard},
};

#[derive(Debug, Error, Eq, PartialEq)]
pub enum GenerateFlashcardsError {
    #[error("at least one chunk is required")]
    EmptyChunks,
    #[error("cards per chunk must be greater than zero")]
    InvalidCardsPerChunk,
    #[error(transparent)]
    Model(#[from] ModelAdapterError),
}

pub fn generate_flashcards(
    chunks: &[DocumentChunk],
    config: FlashcardConfig,
    adapter: &dyn ModelAdapter,
) -> Result<Vec<StudyCard>, GenerateFlashcardsError> {
    if chunks.is_empty() {
        return Err(GenerateFlashcardsError::EmptyChunks);
    }

    if config.cards_per_chunk == 0 {
        return Err(GenerateFlashcardsError::InvalidCardsPerChunk);
    }

    adapter
        .create_flashcards(chunks, &config)
        .map_err(GenerateFlashcardsError::Model)
}

#[cfg(test)]
mod tests {
    use super::{generate_flashcards, GenerateFlashcardsError};
    use crate::{
        app::{FlashcardConfig, ModelAdapter, ModelAdapterError},
        domain::{DocumentChunk, Language, StudyCard},
    };
    use uuid::Uuid;

    struct MockModelAdapter {
        fail: bool,
    }

    impl ModelAdapter for MockModelAdapter {
        fn generate_text(&self, prompt: &str) -> Result<String, ModelAdapterError> {
            Ok(prompt.to_owned())
        }

        fn create_flashcards(
            &self,
            chunks: &[DocumentChunk],
            config: &FlashcardConfig,
        ) -> Result<Vec<StudyCard>, ModelAdapterError> {
            if self.fail {
                return Err(ModelAdapterError::Unavailable);
            }

            let mut cards = Vec::new();

            for chunk in chunks {
                for card_index in 0..config.cards_per_chunk {
                    cards.push(
                        StudyCard::new(
                            chunk.book_id,
                            chunk.id,
                            format!("Pergunta {} sobre {}", card_index + 1, chunk.position),
                            format!("Resposta baseada em {}", chunk.content),
                            vec!["mock".to_owned()],
                        )
                        .map_err(|_| ModelAdapterError::InvalidFlashcards)?,
                    );
                }
            }

            Ok(cards)
        }
    }

    fn chunk() -> DocumentChunk {
        DocumentChunk::new(
            Uuid::new_v4(),
            Uuid::new_v4(),
            0,
            "conteudo de estudo para flashcard",
        )
        .unwrap()
    }

    #[test]
    fn generates_flashcards_from_chunks_with_model_adapter() {
        let chunks = vec![chunk()];
        let cards = generate_flashcards(
            &chunks,
            FlashcardConfig {
                cards_per_chunk: 2,
                language: Language::Pt,
            },
            &MockModelAdapter { fail: false },
        )
        .unwrap();

        assert_eq!(cards.len(), 2);
        assert_eq!(cards[0].front, "Pergunta 1 sobre 0");
        assert_eq!(cards[0].tags, vec!["mock"]);
    }

    #[test]
    fn rejects_empty_chunks() {
        let result = generate_flashcards(
            &[],
            FlashcardConfig {
                cards_per_chunk: 1,
                language: Language::Pt,
            },
            &MockModelAdapter { fail: false },
        );

        assert_eq!(result.unwrap_err(), GenerateFlashcardsError::EmptyChunks);
    }

    #[test]
    fn rejects_zero_cards_per_chunk() {
        let chunks = vec![chunk()];
        let result = generate_flashcards(
            &chunks,
            FlashcardConfig {
                cards_per_chunk: 0,
                language: Language::Pt,
            },
            &MockModelAdapter { fail: false },
        );

        assert_eq!(
            result.unwrap_err(),
            GenerateFlashcardsError::InvalidCardsPerChunk
        );
    }

    #[test]
    fn propagates_model_failure() {
        let chunks = vec![chunk()];
        let result = generate_flashcards(
            &chunks,
            FlashcardConfig {
                cards_per_chunk: 1,
                language: Language::Pt,
            },
            &MockModelAdapter { fail: true },
        );

        assert_eq!(
            result.unwrap_err(),
            GenerateFlashcardsError::Model(ModelAdapterError::Unavailable)
        );
    }
}
