use thiserror::Error;

use crate::domain::{DocumentChunk, Language, StudyCard};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FlashcardConfig {
    pub cards_per_chunk: usize,
    pub language: Language,
}

#[derive(Clone, Debug, Error, Eq, PartialEq)]
pub enum ModelAdapterError {
    #[error("model is unavailable")]
    Unavailable,
    #[error("model returned invalid flashcards: {0}")]
    InvalidFlashcards(String),
}

pub trait ModelAdapter {
    fn generate_text(&self, prompt: &str) -> Result<String, ModelAdapterError>;

    fn create_flashcards(
        &self,
        chunks: &[DocumentChunk],
        config: &FlashcardConfig,
    ) -> Result<Vec<StudyCard>, ModelAdapterError>;
}
