use thiserror::Error;

use crate::{
    app::{ModelAdapter, ModelAdapterError},
    domain::Language,
};

const TRANSLATION_CHUNK_TARGET_CHARS: usize = 2_800;

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

    let translation_chunks = split_translation_chunks(content, TRANSLATION_CHUNK_TARGET_CHARS);
    let total_chunks = translation_chunks.len();
    let mut translated_chunks = Vec::with_capacity(total_chunks);

    for (index, chunk) in translation_chunks.iter().enumerate() {
        let translated_chunk = adapter
            .generate_text(&build_translation_prompt(
                chunk,
                source_language.clone(),
                target_language.clone(),
                index + 1,
                total_chunks,
            ))
            .map(|translated_content| translated_content.trim().to_owned())
            .map_err(TranslateDocumentError::Model)?;

        if !translated_chunk.is_empty() {
            translated_chunks.push(translated_chunk);
        }
    }

    Ok(translated_chunks.join("\n\n"))
}

fn build_translation_prompt(
    content: &str,
    source_language: Language,
    target_language: Language,
    chunk_number: usize,
    total_chunks: usize,
) -> String {
    format!(
        "Traduza o trecho {chunk_number} de {total_chunks} abaixo de {source_language} para {target_language}. \
Preserve quebras de linha, listas, termos tecnicos e sentido original. \
Retorne somente o texto traduzido deste trecho, sem comentarios, markdown adicional ou explicacoes.\n\nTexto:\n{content}",
        chunk_number = chunk_number,
        total_chunks = total_chunks,
        source_language = language_name(source_language),
        target_language = language_name(target_language),
        content = content
    )
}

fn split_translation_chunks(content: &str, target_chars: usize) -> Vec<String> {
    let mut chunks = Vec::new();
    let mut current = String::new();

    for segment in content.split_inclusive('\n') {
        push_translation_segment(&mut chunks, &mut current, segment, target_chars);
    }

    if !current.trim().is_empty() {
        chunks.push(current.trim().to_owned());
    }

    chunks
}

fn push_translation_segment(
    chunks: &mut Vec<String>,
    current: &mut String,
    segment: &str,
    target_chars: usize,
) {
    if segment.chars().count() > target_chars {
        if !current.trim().is_empty() {
            chunks.push(current.trim().to_owned());
            current.clear();
        }

        push_long_translation_segment(chunks, segment, target_chars);
        return;
    }

    if !current.is_empty() && current.chars().count() + segment.chars().count() > target_chars {
        chunks.push(current.trim().to_owned());
        current.clear();
    }

    current.push_str(segment);
}

fn push_long_translation_segment(chunks: &mut Vec<String>, segment: &str, target_chars: usize) {
    let mut current = String::new();

    for word in segment.split_whitespace() {
        if !current.is_empty() && current.chars().count() + word.chars().count() + 1 > target_chars
        {
            chunks.push(current.trim().to_owned());
            current.clear();
        }

        if !current.is_empty() {
            current.push(' ');
        }
        current.push_str(word);
    }

    if !current.trim().is_empty() {
        chunks.push(current.trim().to_owned());
    }
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
    use std::cell::{Cell, RefCell};

    use super::{translate_document, TranslateDocumentError};
    use crate::{
        app::{FlashcardConfig, ModelAdapter, ModelAdapterError},
        domain::{DocumentChunk, Language, StudyCard},
    };

    struct FakeModelAdapter {
        result: Result<String, ModelAdapterError>,
        calls: Cell<usize>,
        prompts: RefCell<Vec<String>>,
    }

    impl ModelAdapter for FakeModelAdapter {
        fn generate_text(&self, prompt: &str) -> Result<String, ModelAdapterError> {
            self.calls.set(self.calls.get() + 1);
            self.prompts.borrow_mut().push(prompt.to_owned());

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
            prompts: RefCell::new(Vec::new()),
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
            prompts: RefCell::new(Vec::new()),
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
            prompts: RefCell::new(Vec::new()),
        };

        let result = translate_document("   ", Language::Pt, Language::En, &adapter);

        assert_eq!(result.unwrap_err(), TranslateDocumentError::EmptyContent);
    }

    #[test]
    fn propagates_model_failure() {
        let adapter = FakeModelAdapter {
            result: Err(ModelAdapterError::Unavailable),
            calls: Cell::new(0),
            prompts: RefCell::new(Vec::new()),
        };

        let result = translate_document("Conteudo.", Language::Pt, Language::En, &adapter);

        assert_eq!(
            result.unwrap_err(),
            TranslateDocumentError::Model(ModelAdapterError::Unavailable)
        );
    }

    #[test]
    fn translates_long_documents_in_multiple_model_calls() {
        let adapter = FakeModelAdapter {
            result: Ok("Translated chunk".to_owned()),
            calls: Cell::new(0),
            prompts: RefCell::new(Vec::new()),
        };
        let long_content = [
            "First section with enough English content to translate.",
            &"Long technical paragraph. ".repeat(180),
            "Final section that must also be translated.",
        ]
        .join("\n\n");

        let translated =
            translate_document(&long_content, Language::En, Language::Pt, &adapter).unwrap();

        assert!(adapter.calls.get() > 1);
        assert_eq!(adapter.prompts.borrow().len(), adapter.calls.get());
        assert!(translated.matches("Translated chunk").count() > 1);
        assert!(adapter
            .prompts
            .borrow()
            .iter()
            .any(|prompt| prompt.contains("trecho 1 de")));
    }
}
