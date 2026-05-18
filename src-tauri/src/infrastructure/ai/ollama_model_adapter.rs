use std::{
    io::{Read, Write},
    net::TcpStream,
    time::Duration,
};

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

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OllamaHttpClient {
    base_url: String,
    timeout: Duration,
}

impl OllamaHttpClient {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            timeout: Duration::from_secs(30),
        }
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }
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
    #[error("ollama base URL is invalid")]
    InvalidBaseUrl,
    #[error("ollama is unavailable")]
    Unavailable,
    #[error("ollama returned HTTP status {0}")]
    HttpStatus(u16),
    #[error("ollama returned an invalid response")]
    InvalidResponse,
}

pub trait OllamaClient {
    fn generate(
        &self,
        request: OllamaGenerateRequest,
    ) -> Result<OllamaGenerateResponse, OllamaClientError>;
}

impl OllamaClient for OllamaHttpClient {
    fn generate(
        &self,
        request: OllamaGenerateRequest,
    ) -> Result<OllamaGenerateResponse, OllamaClientError> {
        let endpoint = OllamaEndpoint::parse(&self.base_url)?;
        let body =
            serde_json::to_string(&request).map_err(|_| OllamaClientError::InvalidResponse)?;
        let mut stream =
            TcpStream::connect(endpoint.address()).map_err(|_| OllamaClientError::Unavailable)?;

        stream
            .set_read_timeout(Some(self.timeout))
            .map_err(|_| OllamaClientError::Unavailable)?;
        stream
            .set_write_timeout(Some(self.timeout))
            .map_err(|_| OllamaClientError::Unavailable)?;

        let http_request = format!(
            "POST {path}/api/generate HTTP/1.1\r\n\
Host: {host}\r\n\
Content-Type: application/json\r\n\
Accept: application/json\r\n\
Content-Length: {content_length}\r\n\
Connection: close\r\n\r\n\
{body}",
            path = endpoint.path_prefix,
            host = endpoint.host_header(),
            content_length = body.len(),
            body = body
        );

        stream
            .write_all(http_request.as_bytes())
            .map_err(|_| OllamaClientError::Unavailable)?;

        let mut response = String::new();
        stream
            .read_to_string(&mut response)
            .map_err(|_| OllamaClientError::Unavailable)?;

        parse_http_generate_response(&response)
    }
}

#[derive(Debug)]
struct OllamaEndpoint {
    host: String,
    port: u16,
    path_prefix: String,
}

impl OllamaEndpoint {
    fn parse(base_url: &str) -> Result<Self, OllamaClientError> {
        let without_scheme = base_url
            .trim()
            .strip_prefix("http://")
            .ok_or(OllamaClientError::InvalidBaseUrl)?;
        let (authority, path_prefix) = without_scheme
            .split_once('/')
            .map(|(authority, path)| (authority, format!("/{}", path.trim_end_matches('/'))))
            .unwrap_or((without_scheme, String::new()));

        if authority.is_empty() {
            return Err(OllamaClientError::InvalidBaseUrl);
        }

        let (host, port) = authority
            .rsplit_once(':')
            .map(|(host, port)| {
                let port = port
                    .parse::<u16>()
                    .map_err(|_| OllamaClientError::InvalidBaseUrl)?;

                Ok((host.to_owned(), port))
            })
            .unwrap_or_else(|| Ok((authority.to_owned(), 80)))?;

        if host.is_empty() {
            return Err(OllamaClientError::InvalidBaseUrl);
        }

        Ok(Self {
            host,
            port,
            path_prefix,
        })
    }

    fn address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }

    fn host_header(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

fn parse_http_generate_response(
    response: &str,
) -> Result<OllamaGenerateResponse, OllamaClientError> {
    let (head, body) = response
        .split_once("\r\n\r\n")
        .ok_or(OllamaClientError::InvalidResponse)?;
    let status_line = head
        .lines()
        .next()
        .ok_or(OllamaClientError::InvalidResponse)?;
    let status = status_line
        .split_whitespace()
        .nth(1)
        .ok_or(OllamaClientError::InvalidResponse)?
        .parse::<u16>()
        .map_err(|_| OllamaClientError::InvalidResponse)?;

    if !(200..300).contains(&status) {
        return Err(OllamaClientError::HttpStatus(status));
    }

    serde_json::from_str(body).map_err(|_| OllamaClientError::InvalidResponse)
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
        OllamaClientError::InvalidBaseUrl => ModelAdapterError::Unavailable,
        OllamaClientError::Unavailable => ModelAdapterError::Unavailable,
        OllamaClientError::HttpStatus(_) => ModelAdapterError::Unavailable,
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
        parse_http_generate_response, OllamaClient, OllamaClientError, OllamaEndpoint,
        OllamaGenerateRequest, OllamaGenerateResponse, OllamaModelAdapter, OllamaModelConfig,
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

    #[test]
    fn parses_ollama_http_success_response() {
        let response =
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"response\":\"ok\"}";

        let response = parse_http_generate_response(response).unwrap();

        assert_eq!(response.response, "ok");
    }

    #[test]
    fn rejects_non_success_http_status() {
        let response = "HTTP/1.1 404 ERROR\r\nContent-Type: application/json\r\n\r\n{\"error\":\"model not found\"}";

        let result = parse_http_generate_response(response);
        assert_eq!(result.unwrap_err(), OllamaClientError::HttpStatus(404));
    }

    #[test]
    fn parses_ollama_endpoint() {
        let endpoint = OllamaEndpoint::parse("http://127.0.0.1:11434").unwrap();

        assert_eq!(endpoint.address(), "127.0.0.1:11434");
        assert_eq!(endpoint.host_header(), "127.0.0.1:11434");
    }

    #[test]
    fn rejects_invalid_base_url() {
        let result = OllamaEndpoint::parse("https://127.0.0.1:11434");

        assert_eq!(result.unwrap_err(), OllamaClientError::InvalidBaseUrl);
    }
}
