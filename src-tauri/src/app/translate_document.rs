use thiserror::Error;

use crate::{
    app::{ModelAdapter, ModelAdapterError},
    domain::Language,
};

#[derive(Debug, Error, Eq, PartialEq)]
pub enum TranslateDocumentError {
    #[error("document content cannot be empty")]
    EmptyContent,
    #[error(transparent)]
    Model(#[from] ModelAdapterError),
}

pub fn translate_document(
    content: &str,
    source_language: Language,
    target_language: Language,
    adapter: &dyn ModelAdapter,
) -> Result<String, TranslateDocumentError> {
    let content = content.trim();

    if content.is_empty() {
        return Err(TranslateDocumentError::EmptyContent);
    }

    if source_language == target_language {
        return Ok(content.to_owned());
    }

    adapter
        .generate_text(&build_translation_prompt(
            content,
            source_language,
            target_language,
        ))
        .map(|translated_content| translated_content.trim().to_owned())
        .map_err(TranslateDocumentError::Model)
}

fn build_translation_prompt(
    content: &str,
    source_language: Language,
    target_language: Language,
) -> String {
    format!(
        "Traduza o texto abaixo de {source_language} para {target_language}. \
Preserve quebras de linha, listas, termos tecnicos e sentido original. \
Retorne somente o texto traduzido, sem comentarios, markdown adicional ou explicacoes.\n\nTexto:\n{content}",
        source_language = language_name(source_language),
        target_language = language_name(target_language),
        content = content
    )
}

fn language_name(language: Language) -> &'static str {
    match language {
        Language::Pt => "Portugues",
        Language::En => "English",
        Language::Es => "Espanol",
    }
}

#[cfg(test)]
mod tests {
    use std::cell::Cell;

    use super::{translate_document, TranslateDocumentError};
    use crate::{
        app::{FlashcardConfig, ModelAdapter, ModelAdapterError},
        domain::{DocumentChunk, Language, StudyCard},
    };

    struct FakeModelAdapter {
        result: Result<String, ModelAdapterError>,
        calls: Cell<usize>,
    }

    impl ModelAdapter for FakeModelAdapter {
        fn generate_text(&self, prompt: &str) -> Result<String, ModelAdapterError> {
            self.calls.set(self.calls.get() + 1);

            self.result
                .clone()
                .map(|translation| format!("{translation}\n\nprompt: {prompt}"))
        }

        fn create_flashcards(
            &self,
            _chunks: &[DocumentChunk],
            _config: &FlashcardConfig,
        ) -> Result<Vec<StudyCard>, ModelAdapterError> {
            Ok(Vec::new())
        }
    }

    #[test]
    fn translates_document_with_model_adapter() {
        let adapter = FakeModelAdapter {
            result: Ok("Translated content".to_owned()),
            calls: Cell::new(0),
        };

        let translated =
            translate_document("Conteudo tecnico.", Language::Pt, Language::En, &adapter).unwrap();

        assert!(translated.contains("Translated content"));
        assert!(translated.contains("Conteudo tecnico."));
        assert!(translated.contains("English"));
        assert_eq!(adapter.calls.get(), 1);
    }

    #[test]
    fn returns_original_content_when_language_is_the_same() {
        let adapter = FakeModelAdapter {
            result: Ok("Nao deve chamar modelo".to_owned()),
            calls: Cell::new(0),
        };

        let translated =
            translate_document("Mesmo idioma.", Language::Pt, Language::Pt, &adapter).unwrap();

        assert_eq!(translated, "Mesmo idioma.");
        assert_eq!(adapter.calls.get(), 0);
    }

    #[test]
    fn rejects_empty_content() {
        let adapter = FakeModelAdapter {
            result: Ok("Traducao".to_owned()),
            calls: Cell::new(0),
        };

        let result = translate_document("   ", Language::Pt, Language::En, &adapter);

        assert_eq!(result.unwrap_err(), TranslateDocumentError::EmptyContent);
    }

    #[test]
    fn propagates_model_failure() {
        let adapter = FakeModelAdapter {
            result: Err(ModelAdapterError::Unavailable),
            calls: Cell::new(0),
        };

        let result = translate_document("Conteudo.", Language::Pt, Language::En, &adapter);

        assert_eq!(
            result.unwrap_err(),
            TranslateDocumentError::Model(ModelAdapterError::Unavailable)
        );
    }
}
