use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    app::{FlashcardConfig, ModelAdapter, ModelAdapterError},
    domain::{DocumentChunk, Language, StudyCard},
};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OllamaModelConfig {
    pub model: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct OllamaGenerateRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize)]
pub struct OllamaGenerateResponse {
    pub response: String,
}

#[derive(Clone, Debug, Error, Eq, PartialEq)]
pub enum OllamaClientError {
    #[error("ollama is unavailable")]
    Unavailable,
    #[error("ollama returned an invalid response")]
    InvalidResponse,
}

pub trait OllamaClient {
    fn generate(
        &self,
        request: OllamaGenerateRequest,
    ) -> Result<OllamaGenerateResponse, OllamaClientError>;
}

pub struct OllamaModelAdapter<C> {
    client: C,
    config: OllamaModelConfig,
}

impl<C> OllamaModelAdapter<C> {
    pub fn new(client: C, config: OllamaModelConfig) -> Self {
        Self { client, config }
    }
}

impl<C> ModelAdapter for OllamaModelAdapter<C>
where
    C: OllamaClient,
{
    fn generate_text(&self, prompt: &str) -> Result<String, ModelAdapterError> {
        let response = self
            .client
            .generate(OllamaGenerateRequest {
                model: self.config.model.clone(),
                prompt: prompt.to_owned(),
                stream: false,
            })
            .map_err(map_client_error)?;

        Ok(response.response)
    }

    fn create_flashcards(
        &self,
        chunks: &[DocumentChunk],
        config: &FlashcardConfig,
    ) -> Result<Vec<StudyCard>, ModelAdapterError> {
        let response = self
            .client
            .generate(OllamaGenerateRequest {
                model: self.config.model.clone(),
                prompt: build_flashcard_prompt(chunks, config),
                stream: false,
            })
            .map_err(map_client_error)?;

        parse_flashcards_response(&response.response, chunks)
            .map_err(|_| ModelAdapterError::InvalidFlashcards)
    }
}

fn map_client_error(error: OllamaClientError) -> ModelAdapterError {
    match error {
        OllamaClientError::Unavailable => ModelAdapterError::Unavailable,
        OllamaClientError::InvalidResponse => ModelAdapterError::InvalidFlashcards,
    }
}

fn build_flashcard_prompt(chunks: &[DocumentChunk], config: &FlashcardConfig) -> String {
    let language = match config.language {
        Language::Pt => "Portugues",
        Language::En => "English",
        Language::Es => "Espanol",
    };

    let chunk_lines = chunks
        .iter()
        .map(|chunk| {
            format!(
                "chunk_id: {}\nposicao: {}\nconteudo: {}",
                chunk.id, chunk.position, chunk.content
            )
        })
        .collect::<Vec<_>>()
        .join("\n\n");

    format!(
        "Gere {cards_per_chunk} flashcard(s) por chunk em {language}. \
Responda somente JSON valido no formato: \
[{example}].\n\nChunks:\n{chunk_lines}",
        cards_per_chunk = config.cards_per_chunk,
        language = language,
        example = r#"{"chunk_id":"uuid","front":"pergunta","back":"resposta","tags":["tag"]}"#,
        chunk_lines = chunk_lines
    )
}

#[derive(Deserialize)]
struct RawFlashcard {
    chunk_id: String,
    front: String,
    back: String,
    #[serde(default)]
    tags: Vec<String>,
}

fn parse_flashcards_response(
    response: &str,
    chunks: &[DocumentChunk],
) -> Result<Vec<StudyCard>, ModelAdapterError> {
    let json = extract_json_array(response).ok_or(ModelAdapterError::InvalidFlashcards)?;
    let raw_cards: Vec<RawFlashcard> =
        serde_json::from_str(json).map_err(|_| ModelAdapterError::InvalidFlashcards)?;
    let mut cards = Vec::new();

    for raw_card in raw_cards {
        let chunk = chunks
            .iter()
            .find(|chunk| chunk.id.to_string() == raw_card.chunk_id)
            .ok_or(ModelAdapterError::InvalidFlashcards)?;

        cards.push(
            StudyCard::new(
                chunk.book_id,
                chunk.id,
                raw_card.front,
                raw_card.back,
                raw_card.tags,
            )
            .map_err(|_| ModelAdapterError::InvalidFlashcards)?,
        );
    }

    Ok(cards)
}

fn extract_json_array(response: &str) -> Option<&str> {
    let start = response.find('[')?;
    let end = response.rfind(']')?;

    if start > end {
        return None;
    }

    Some(&response[start..=end])
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use uuid::Uuid;

    use super::{
        OllamaClient, OllamaClientError, OllamaGenerateRequest, OllamaGenerateResponse,
        OllamaModelAdapter, OllamaModelConfig,
    };
    use crate::{
        app::{FlashcardConfig, ModelAdapter, ModelAdapterError},
        domain::{DocumentChunk, Language},
    };

    struct FakeOllamaClient {
        response: Result<String, OllamaClientError>,
        requests: RefCell<Vec<OllamaGenerateRequest>>,
    }

    impl FakeOllamaClient {
        fn available(response: String) -> Self {
            Self {
                response: Ok(response),
                requests: RefCell::new(Vec::new()),
            }
        }

        fn unavailable() -> Self {
            Self {
                response: Err(OllamaClientError::Unavailable),
                requests: RefCell::new(Vec::new()),
            }
        }
    }

    impl OllamaClient for FakeOllamaClient {
        fn generate(
            &self,
            request: OllamaGenerateRequest,
        ) -> Result<OllamaGenerateResponse, OllamaClientError> {
            self.requests.borrow_mut().push(request);

            self.response
                .clone()
                .map(|response| OllamaGenerateResponse { response })
        }
    }

    fn chunk() -> DocumentChunk {
        DocumentChunk::new(Uuid::new_v4(), Uuid::new_v4(), 1, "conteudo de estudo").unwrap()
    }

    #[test]
    fn sends_prompt_to_configured_ollama_model() {
        let client = FakeOllamaClient::available("resposta".to_owned());
        let adapter = OllamaModelAdapter::new(
            client,
            OllamaModelConfig {
                model: "llama3.2".to_owned(),
            },
        );

        let response = adapter.generate_text("ola").unwrap();

        assert_eq!(response, "resposta");
        let requests = adapter.client.requests.borrow();
        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0].model, "llama3.2");
        assert_eq!(requests[0].prompt, "ola");
        assert!(!requests[0].stream);
    }

    #[test]
    fn creates_flashcards_from_ollama_json_response() {
        let chunk = chunk();
        let response = format!(
            r#"[{{"chunk_id":"{}","front":"Pergunta","back":"Resposta","tags":["ollama"]}}]"#,
            chunk.id
        );
        let client = FakeOllamaClient::available(response);
        let adapter = OllamaModelAdapter::new(
            client,
            OllamaModelConfig {
                model: "llama3.2".to_owned(),
            },
        );

        let cards = adapter
            .create_flashcards(
                &[chunk.clone()],
                &FlashcardConfig {
                    cards_per_chunk: 1,
                    language: Language::Pt,
                },
            )
            .unwrap();

        assert_eq!(cards.len(), 1);
        assert_eq!(cards[0].book_id, chunk.book_id);
        assert_eq!(cards[0].chunk_id, chunk.id);
        assert_eq!(cards[0].front, "Pergunta");
        assert_eq!(cards[0].back, "Resposta");
        assert_eq!(cards[0].tags, vec!["ollama"]);
        assert!(adapter.client.requests.borrow()[0]
            .prompt
            .contains("conteudo de estudo"));
    }

    #[test]
    fn extracts_json_array_from_text_wrapped_response() {
        let chunk = chunk();
        let response = format!(
            "```json\n[{{\"chunk_id\":\"{}\",\"front\":\"Pergunta\",\"back\":\"Resposta\"}}]\n```",
            chunk.id
        );
        let adapter = OllamaModelAdapter::new(
            FakeOllamaClient::available(response),
            OllamaModelConfig {
                model: "llama3.2".to_owned(),
            },
        );

        let cards = adapter
            .create_flashcards(
                &[chunk],
                &FlashcardConfig {
                    cards_per_chunk: 1,
                    language: Language::Pt,
                },
            )
            .unwrap();

        assert_eq!(cards[0].front, "Pergunta");
    }

    #[test]
    fn rejects_invalid_flashcard_json() {
        let adapter = OllamaModelAdapter::new(
            FakeOllamaClient::available("sem json".to_owned()),
            OllamaModelConfig {
                model: "llama3.2".to_owned(),
            },
        );

        let result = adapter.create_flashcards(
            &[chunk()],
            &FlashcardConfig {
                cards_per_chunk: 1,
                language: Language::Pt,
            },
        );

        assert_eq!(result.unwrap_err(), ModelAdapterError::InvalidFlashcards);
    }

    #[test]
    fn maps_ollama_unavailable_to_model_unavailable() {
        let adapter = OllamaModelAdapter::new(
            FakeOllamaClient::unavailable(),
            OllamaModelConfig {
                model: "llama3.2".to_owned(),
            },
        );

        let result = adapter.generate_text("ola");

        assert_eq!(result.unwrap_err(), ModelAdapterError::Unavailable);
    }
}
