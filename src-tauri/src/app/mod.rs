pub mod chunk_document;
pub mod entitlement_guard;
pub mod generate_flashcards;
pub mod license_service;
pub mod model_adapter;
pub mod translate_document;
pub mod translation_provider;

pub use chunk_document::{chunk_document, ChunkDocumentConfig, ChunkDocumentError};
pub use generate_flashcards::{generate_flashcards, GenerateFlashcardsError};
pub use model_adapter::{FlashcardConfig, ModelAdapter, ModelAdapterError};
pub use translate_document::{
    translate_document, translate_document_with_provider_status, TranslateDocumentError,
    TranslatedDocument,
};
pub use translation_provider::{
    FallbackTranslationProvider, ModelAdapterTranslationProvider, TranslationProvider,
    TranslationProviderError, TranslationProviderId,
};
