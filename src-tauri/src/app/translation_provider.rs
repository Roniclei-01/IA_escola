use std::cell::Cell;

use thiserror::Error;

use crate::{
    app::{ModelAdapter, ModelAdapterError},
    domain::Language,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TranslationProviderId {
    Unknown,
    LibreTranslate,
    Ollama,
    Mixed,
}

#[derive(Clone, Debug, Error, Eq, PartialEq)]
pub enum TranslationProviderError {
    #[error("translation provider is unavailable")]
    Unavailable,
    #[error("translation provider returned an invalid response: {0}")]
    InvalidResponse(String),
}

pub trait TranslationProvider {
    fn provider_id(&self) -> TranslationProviderId {
        TranslationProviderId::Unknown
    }

    fn used_provider_id(&self) -> TranslationProviderId {
        self.provider_id()
    }

    fn translate_text(
        &self,
        text: &str,
        source_language: Language,
        target_language: Language,
    ) -> Result<String, TranslationProviderError>;
}

pub struct ModelAdapterTranslationProvider<'a> {
    adapter: &'a dyn ModelAdapter,
}

impl<'a> ModelAdapterTranslationProvider<'a> {
    pub fn new(adapter: &'a dyn ModelAdapter) -> Self {
        Self { adapter }
    }
}

impl TranslationProvider for ModelAdapterTranslationProvider<'_> {
    fn provider_id(&self) -> TranslationProviderId {
        TranslationProviderId::Ollama
    }

    fn translate_text(
        &self,
        text: &str,
        source_language: Language,
        target_language: Language,
    ) -> Result<String, TranslationProviderError> {
        self.adapter
            .generate_text(&build_llm_translation_prompt(
                text,
                source_language,
                target_language,
            ))
            .map_err(map_model_error)
    }
}

pub struct FallbackTranslationProvider<'a> {
    primary: &'a dyn TranslationProvider,
    fallback: &'a dyn TranslationProvider,
    primary_failed: Cell<bool>,
    used_primary: Cell<bool>,
    used_fallback: Cell<bool>,
}

impl<'a> FallbackTranslationProvider<'a> {
    pub fn new(
        primary: &'a dyn TranslationProvider,
        fallback: &'a dyn TranslationProvider,
    ) -> Self {
        Self {
            primary,
            fallback,
            primary_failed: Cell::new(false),
            used_primary: Cell::new(false),
            used_fallback: Cell::new(false),
        }
    }
}

impl TranslationProvider for FallbackTranslationProvider<'_> {
    fn used_provider_id(&self) -> TranslationProviderId {
        match (self.used_primary.get(), self.used_fallback.get()) {
            (true, true) => TranslationProviderId::Mixed,
            (true, false) => self.primary.used_provider_id(),
            (false, true) => self.fallback.used_provider_id(),
            (false, false) => TranslationProviderId::Unknown,
        }
    }

    fn translate_text(
        &self,
        text: &str,
        source_language: Language,
        target_language: Language,
    ) -> Result<String, TranslationProviderError> {
        if !self.primary_failed.get() {
            match self.primary.translate_text(
                text,
                source_language.clone(),
                target_language.clone(),
            ) {
                Ok(translated_text) => {
                    self.used_primary.set(true);
                    return Ok(translated_text);
                }
                Err(_) => self.primary_failed.set(true),
            }
        }

        let translated_text =
            self.fallback
                .translate_text(text, source_language, target_language)?;
        self.used_fallback.set(true);

        Ok(translated_text)
    }
}

fn build_llm_translation_prompt(
    content: &str,
    source_language: Language,
    target_language: Language,
) -> String {
    format!(
        "Traduza integralmente o texto abaixo de {source_language} para {target_language}. \
Nao resuma, nao omita linhas, tabelas, URLs, numeros ou termos tecnicos. \
Preserve quebras de linha, listas, ordem e sentido original. \
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

fn map_model_error(error: ModelAdapterError) -> TranslationProviderError {
    match error {
        ModelAdapterError::Unavailable => TranslationProviderError::Unavailable,
        ModelAdapterError::InvalidFlashcards(reason) => {
            TranslationProviderError::InvalidResponse(reason)
        }
    }
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use super::{
        FallbackTranslationProvider, TranslationProvider, TranslationProviderError,
        TranslationProviderId,
    };
    use crate::domain::Language;

    struct FakeTranslationProvider {
        result: Result<String, TranslationProviderError>,
        received_texts: RefCell<Vec<String>>,
        provider_id: TranslationProviderId,
    }

    impl TranslationProvider for FakeTranslationProvider {
        fn translate_text(
            &self,
            text: &str,
            _source_language: Language,
            _target_language: Language,
        ) -> Result<String, TranslationProviderError> {
            self.received_texts.borrow_mut().push(text.to_owned());

            self.result.clone()
        }

        fn provider_id(&self) -> TranslationProviderId {
            self.provider_id
        }
    }

    #[test]
    fn falls_back_when_primary_translation_provider_fails() {
        let primary = FakeTranslationProvider {
            result: Err(TranslationProviderError::Unavailable),
            received_texts: RefCell::new(Vec::new()),
            provider_id: TranslationProviderId::LibreTranslate,
        };
        let fallback = FakeTranslationProvider {
            result: Ok("Texto traduzido pelo fallback.".to_owned()),
            received_texts: RefCell::new(Vec::new()),
            provider_id: TranslationProviderId::Ollama,
        };
        let provider = FallbackTranslationProvider::new(&primary, &fallback);

        let translated = provider
            .translate_text("Original text.", Language::En, Language::Pt)
            .unwrap();

        assert_eq!(translated, "Texto traduzido pelo fallback.");
        assert_eq!(
            primary.received_texts.borrow().as_slice(),
            ["Original text."]
        );
        assert_eq!(
            fallback.received_texts.borrow().as_slice(),
            ["Original text."]
        );
    }

    #[test]
    fn reuses_fallback_after_primary_translation_provider_fails_once() {
        let primary = FakeTranslationProvider {
            result: Err(TranslationProviderError::Unavailable),
            received_texts: RefCell::new(Vec::new()),
            provider_id: TranslationProviderId::LibreTranslate,
        };
        let fallback = FakeTranslationProvider {
            result: Ok("Texto traduzido pelo fallback.".to_owned()),
            received_texts: RefCell::new(Vec::new()),
            provider_id: TranslationProviderId::Ollama,
        };
        let provider = FallbackTranslationProvider::new(&primary, &fallback);

        provider
            .translate_text("First text.", Language::En, Language::Pt)
            .unwrap();
        provider
            .translate_text("Second text.", Language::En, Language::Pt)
            .unwrap();

        assert_eq!(primary.received_texts.borrow().as_slice(), ["First text."]);
        assert_eq!(
            fallback.received_texts.borrow().as_slice(),
            ["First text.", "Second text."]
        );
    }

    #[test]
    fn does_not_call_fallback_when_primary_translation_provider_succeeds() {
        let primary = FakeTranslationProvider {
            result: Ok("Texto traduzido pelo provedor principal.".to_owned()),
            received_texts: RefCell::new(Vec::new()),
            provider_id: TranslationProviderId::LibreTranslate,
        };
        let fallback = FakeTranslationProvider {
            result: Ok("Texto traduzido pelo fallback.".to_owned()),
            received_texts: RefCell::new(Vec::new()),
            provider_id: TranslationProviderId::Ollama,
        };
        let provider = FallbackTranslationProvider::new(&primary, &fallback);

        let translated = provider
            .translate_text("Original text.", Language::En, Language::Pt)
            .unwrap();

        assert_eq!(translated, "Texto traduzido pelo provedor principal.");
        assert_eq!(
            primary.received_texts.borrow().as_slice(),
            ["Original text."]
        );
        assert!(fallback.received_texts.borrow().is_empty());
    }

    #[test]
    fn reports_provider_used_by_fallback_translation_provider() {
        let primary = FakeTranslationProvider {
            result: Err(TranslationProviderError::Unavailable),
            received_texts: RefCell::new(Vec::new()),
            provider_id: TranslationProviderId::LibreTranslate,
        };
        let fallback = FakeTranslationProvider {
            result: Ok("Texto traduzido pelo fallback.".to_owned()),
            received_texts: RefCell::new(Vec::new()),
            provider_id: TranslationProviderId::Ollama,
        };
        let provider = FallbackTranslationProvider::new(&primary, &fallback);

        provider
            .translate_text("Original.", Language::En, Language::Pt)
            .unwrap();

        assert_eq!(provider.used_provider_id(), TranslationProviderId::Ollama);
    }
}
