use thiserror::Error;

use crate::{
    app::{TranslationProvider, TranslationProviderError, TranslationProviderId},
    domain::Language,
};

const TRANSLATION_CHUNK_TARGET_CHARS: usize = 900;

#[derive(Debug, Error, Eq, PartialEq)]
pub enum TranslateDocumentError {
    #[error("document content cannot be empty")]
    EmptyContent,
    #[error("translation provider returned empty translated content")]
    EmptyTranslation,
    #[error(transparent)]
    Provider(#[from] TranslationProviderError),
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct TranslatedDocument {
    pub content: String,
    pub provider: TranslationProviderId,
}

pub fn translate_document(
    content: &str,
    source_language: Language,
    target_language: Language,
    provider: &dyn TranslationProvider,
) -> Result<String, TranslateDocumentError> {
    translate_document_with_provider_status(content, source_language, target_language, provider)
        .map(|translated_document| translated_document.content)
}

pub fn translate_document_with_provider_status(
    content: &str,
    source_language: Language,
    target_language: Language,
    provider: &dyn TranslationProvider,
) -> Result<TranslatedDocument, TranslateDocumentError> {
    let content = content.trim();

    if content.is_empty() {
        return Err(TranslateDocumentError::EmptyContent);
    }

    if source_language == target_language {
        return Ok(TranslatedDocument {
            content: content.to_owned(),
            provider: TranslationProviderId::Unknown,
        });
    }

    let translation_chunks = split_translation_chunks(content, TRANSLATION_CHUNK_TARGET_CHARS);
    let mut translated_chunks = Vec::with_capacity(translation_chunks.len());

    for chunk in &translation_chunks {
        let translated_chunk = provider
            .translate_text(chunk, source_language.clone(), target_language.clone())
            .map(|translated_content| translated_content.trim().to_owned())
            .map_err(TranslateDocumentError::Provider)?;

        if translated_chunk.is_empty() {
            return Err(TranslateDocumentError::EmptyTranslation);
        }

        translated_chunks.push(translated_chunk);
    }

    Ok(TranslatedDocument {
        content: translated_chunks.join("\n\n"),
        provider: provider.used_provider_id(),
    })
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

#[cfg(test)]
mod tests {
    use std::cell::{Cell, RefCell};

    use super::{
        translate_document, translate_document_with_provider_status, TranslateDocumentError,
    };
    use crate::{
        app::{TranslationProvider, TranslationProviderError, TranslationProviderId},
        domain::Language,
    };

    struct FakeTranslationProvider {
        result: Result<String, TranslationProviderError>,
        calls: Cell<usize>,
        received_texts: RefCell<Vec<String>>,
    }

    impl TranslationProvider for FakeTranslationProvider {
        fn provider_id(&self) -> TranslationProviderId {
            TranslationProviderId::LibreTranslate
        }

        fn translate_text(
            &self,
            text: &str,
            _source_language: Language,
            _target_language: Language,
        ) -> Result<String, TranslationProviderError> {
            self.calls.set(self.calls.get() + 1);
            self.received_texts.borrow_mut().push(text.to_owned());

            self.result
                .clone()
                .map(|translation| format!("{translation}\n\nsource: {text}"))
        }
    }

    struct EmptyTranslationProvider {
        calls: Cell<usize>,
    }

    impl TranslationProvider for EmptyTranslationProvider {
        fn translate_text(
            &self,
            _text: &str,
            _source_language: Language,
            _target_language: Language,
        ) -> Result<String, TranslationProviderError> {
            self.calls.set(self.calls.get() + 1);

            Ok("   ".to_owned())
        }
    }

    #[test]
    fn translates_document_with_translation_provider() {
        let provider = FakeTranslationProvider {
            result: Ok("Translated content".to_owned()),
            calls: Cell::new(0),
            received_texts: RefCell::new(Vec::new()),
        };

        let translated =
            translate_document("Conteudo tecnico.", Language::Pt, Language::En, &provider).unwrap();

        assert!(translated.contains("Translated content"));
        assert!(translated.contains("Conteudo tecnico."));
        assert_eq!(provider.calls.get(), 1);
    }

    #[test]
    fn reports_translation_provider_used_by_document_translation() {
        let provider = FakeTranslationProvider {
            result: Ok("Translated content".to_owned()),
            calls: Cell::new(0),
            received_texts: RefCell::new(Vec::new()),
        };

        let translated = translate_document_with_provider_status(
            "Conteudo tecnico.",
            Language::Pt,
            Language::En,
            &provider,
        )
        .unwrap();

        assert_eq!(translated.provider, TranslationProviderId::LibreTranslate);
        assert!(translated.content.contains("Translated content"));
    }

    #[test]
    fn returns_original_content_when_language_is_the_same() {
        let provider = FakeTranslationProvider {
            result: Ok("Nao deve chamar provedor".to_owned()),
            calls: Cell::new(0),
            received_texts: RefCell::new(Vec::new()),
        };

        let translated =
            translate_document("Mesmo idioma.", Language::Pt, Language::Pt, &provider).unwrap();

        assert_eq!(translated, "Mesmo idioma.");
        assert_eq!(provider.calls.get(), 0);
    }

    #[test]
    fn rejects_empty_content() {
        let provider = FakeTranslationProvider {
            result: Ok("Traducao".to_owned()),
            calls: Cell::new(0),
            received_texts: RefCell::new(Vec::new()),
        };

        let result = translate_document("   ", Language::Pt, Language::En, &provider);

        assert_eq!(result.unwrap_err(), TranslateDocumentError::EmptyContent);
    }

    #[test]
    fn propagates_translation_provider_failure() {
        let provider = FakeTranslationProvider {
            result: Err(TranslationProviderError::Unavailable),
            calls: Cell::new(0),
            received_texts: RefCell::new(Vec::new()),
        };

        let result = translate_document("Conteudo.", Language::Pt, Language::En, &provider);

        assert_eq!(
            result.unwrap_err(),
            TranslateDocumentError::Provider(TranslationProviderError::Unavailable)
        );
    }

    #[test]
    fn rejects_empty_translation_from_provider() {
        let provider = EmptyTranslationProvider {
            calls: Cell::new(0),
        };

        let result = translate_document("Conteudo.", Language::Pt, Language::En, &provider);

        assert_eq!(
            result.unwrap_err(),
            TranslateDocumentError::EmptyTranslation
        );
        assert_eq!(provider.calls.get(), 1);
    }

    #[test]
    fn translates_long_documents_in_multiple_provider_calls() {
        let provider = FakeTranslationProvider {
            result: Ok("Translated chunk".to_owned()),
            calls: Cell::new(0),
            received_texts: RefCell::new(Vec::new()),
        };
        let long_content = [
            "First section with enough English content to translate.",
            &"Long technical paragraph. ".repeat(180),
            "Final section that must also be translated.",
        ]
        .join("\n\n");

        let translated =
            translate_document(&long_content, Language::En, Language::Pt, &provider).unwrap();

        assert!(provider.calls.get() > 1);
        assert_eq!(provider.received_texts.borrow().len(), provider.calls.get());
        assert!(translated.matches("Translated chunk").count() > 1);
        assert!(provider
            .received_texts
            .borrow()
            .iter()
            .any(|text| text.contains("First section")));
    }
}
