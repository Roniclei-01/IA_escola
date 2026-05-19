use std::{
    io::{Read, Write},
    net::TcpStream,
    time::Duration,
};

use serde::{Deserialize, Serialize};
use serde_json::Value;
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
            timeout: Duration::from_secs(180),
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
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

    let body = if has_chunked_transfer_encoding(head) {
        decode_chunked_body(body)?
    } else {
        body.to_owned()
    };

    serde_json::from_str(&body).map_err(|_| OllamaClientError::InvalidResponse)
}

fn has_chunked_transfer_encoding(head: &str) -> bool {
    head.lines().any(|line| {
        line.split_once(':')
            .map(|(name, value)| {
                name.eq_ignore_ascii_case("transfer-encoding")
                    && value
                        .split(',')
                        .any(|encoding| encoding.trim().eq_ignore_ascii_case("chunked"))
            })
            .unwrap_or(false)
    })
}

fn decode_chunked_body(body: &str) -> Result<String, OllamaClientError> {
    let mut remaining = body;
    let mut decoded = String::new();

    loop {
        let (size_line, rest) = remaining
            .split_once("\r\n")
            .ok_or(OllamaClientError::InvalidResponse)?;
        let size_hex = size_line
            .split_once(';')
            .map(|(size, _)| size)
            .unwrap_or(size_line);
        let size = usize::from_str_radix(size_hex.trim(), 16)
            .map_err(|_| OllamaClientError::InvalidResponse)?;

        if size == 0 {
            return Ok(decoded);
        }

        if rest.len() < size + 2 {
            return Err(OllamaClientError::InvalidResponse);
        }

        let (chunk, rest) = rest.split_at(size);
        decoded.push_str(chunk);

        if !rest.starts_with("\r\n") {
            return Err(OllamaClientError::InvalidResponse);
        }

        remaining = &rest[2..];
    }
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
                format: None,
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
                format: Some("json".to_owned()),
            })
            .map_err(map_client_error)?;

        parse_flashcards_response(&response.response, chunks)
            .map_err(|error| invalid_flashcards_error(&response.response, error))
    }
}

fn map_client_error(error: OllamaClientError) -> ModelAdapterError {
    match error {
        OllamaClientError::InvalidBaseUrl => ModelAdapterError::Unavailable,
        OllamaClientError::Unavailable => ModelAdapterError::Unavailable,
        OllamaClientError::HttpStatus(_) => ModelAdapterError::Unavailable,
        OllamaClientError::InvalidResponse => {
            ModelAdapterError::InvalidFlashcards("resposta HTTP invalida do Ollama".to_owned())
        }
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
        "Voce gera flashcards para estudo. \
Responda em {language}. \
Retorne somente um array JSON valido, sem markdown e sem texto fora do JSON. \
Crie exatamente {cards_per_chunk} card(s) por chunk. \
Cada item deve ter este formato: {example}. \
Use exatamente o chunk_id informado em cada chunk.\n\nChunks:\n{chunk_lines}",
        cards_per_chunk = config.cards_per_chunk,
        language = language,
        example = r#"{"chunk_id":"uuid","front":"pergunta","back":"resposta","tags":["tag"]}"#,
        chunk_lines = chunk_lines
    )
}

#[derive(Deserialize)]
struct RawFlashcard {
    #[serde(default, alias = "chunkId")]
    chunk_id: Option<String>,
    #[serde(default, alias = "question", alias = "pergunta")]
    front: Option<String>,
    #[serde(default, alias = "answer", alias = "resposta")]
    back: Option<String>,
    #[serde(default)]
    tags: Vec<String>,
}

struct ParsedFlashcard {
    chunk_id: Option<String>,
    front: String,
    back: String,
    tags: Vec<String>,
}

fn parse_flashcards_response(
    response: &str,
    chunks: &[DocumentChunk],
) -> Result<Vec<StudyCard>, ModelAdapterError> {
    let raw_cards = parse_raw_flashcards_response(response)?;
    let mut cards = Vec::new();

    for raw_card in raw_cards {
        let matching_chunk = raw_card
            .chunk_id
            .as_deref()
            .and_then(|chunk_id| chunks.iter().find(|chunk| chunk.id.to_string() == chunk_id));
        let chunk = matching_chunk
            .or_else(|| {
                if chunks.len() == 1 {
                    chunks.first()
                } else {
                    None
                }
            })
            .ok_or_else(|| invalid_flashcards_reason("chunk_id nao corresponde a nenhum chunk"))?;

        cards.push(
            StudyCard::new(
                chunk.book_id,
                chunk.id,
                raw_card.front,
                raw_card.back,
                raw_card.tags,
            )
            .map_err(|error| invalid_flashcards_reason(&error.to_string()))?,
        );
    }

    Ok(cards)
}

fn parse_raw_flashcards_response(
    response: &str,
) -> Result<Vec<ParsedFlashcard>, ModelAdapterError> {
    if let Some(json) = extract_json_array(response) {
        if let Ok(value) = serde_json::from_str(json) {
            if let Ok(raw_cards) = raw_flashcards_from_value(&value) {
                return Ok(raw_cards);
            }
        }
    }

    let json = extract_json_object(response)
        .ok_or_else(|| invalid_flashcards_reason("nao encontrei JSON na resposta"))?;
    let value: Value = serde_json::from_str(json)
        .map_err(|error| invalid_flashcards_reason(&format!("JSON invalido: {error}")))?;

    raw_flashcards_from_value(&value)
}

fn raw_flashcards_from_value(value: &Value) -> Result<Vec<ParsedFlashcard>, ModelAdapterError> {
    if let Some(cards) = value.as_array() {
        return cards.iter().map(parsed_flashcard_from_value).collect();
    }

    if let Some(cards) = value.get("cards").and_then(Value::as_array) {
        return cards.iter().map(parsed_flashcard_from_value).collect();
    }

    if let Some(cards) = value.get("flashcards").and_then(Value::as_array) {
        return cards.iter().map(parsed_flashcard_from_value).collect();
    }

    parsed_flashcard_from_value(value).map(|card| vec![card])
}

fn parsed_flashcard_from_value(value: &Value) -> Result<ParsedFlashcard, ModelAdapterError> {
    let raw_card: RawFlashcard = serde_json::from_value(value.clone())
        .map_err(|error| invalid_flashcards_reason(&format!("card invalido: {error}")))?;
    let front = raw_card
        .front
        .ok_or_else(|| invalid_flashcards_reason("campo front/question/pergunta ausente"))?;
    let back = raw_card
        .back
        .ok_or_else(|| invalid_flashcards_reason("campo back/answer/resposta ausente"))?;

    Ok(ParsedFlashcard {
        chunk_id: raw_card.chunk_id,
        front,
        back,
        tags: raw_card.tags,
    })
}

fn invalid_flashcards_reason(reason: &str) -> ModelAdapterError {
    ModelAdapterError::InvalidFlashcards(reason.to_owned())
}

fn invalid_flashcards_error(response: &str, error: ModelAdapterError) -> ModelAdapterError {
    match error {
        ModelAdapterError::InvalidFlashcards(reason) => {
            ModelAdapterError::InvalidFlashcards(format!(
                "{reason}. Trecho da resposta: {}",
                response_snippet(response)
            ))
        }
        ModelAdapterError::Unavailable => ModelAdapterError::Unavailable,
    }
}

fn response_snippet(response: &str) -> String {
    let normalized = response.split_whitespace().collect::<Vec<_>>().join(" ");
    normalized.chars().take(240).collect()
}

fn extract_json_array(response: &str) -> Option<&str> {
    let start = response.find('[')?;
    let end = response.rfind(']')?;

    if start > end {
        return None;
    }

    Some(&response[start..=end])
}

fn extract_json_object(response: &str) -> Option<&str> {
    let start = response.find('{')?;
    let end = response.rfind('}')?;

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
    fn accepts_single_flashcard_json_object_response() {
        let chunk = chunk();
        let response = format!(
            r#"{{"chunk_id":"{}","front":"Pergunta unica","back":"Resposta unica","tags":["ollama"]}}"#,
            chunk.id
        );
        let adapter = OllamaModelAdapter::new(
            FakeOllamaClient::available(response),
            OllamaModelConfig {
                model: "llama3.2:1b".to_owned(),
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

        assert_eq!(cards.len(), 1);
        assert_eq!(cards[0].front, "Pergunta unica");
    }

    #[test]
    fn uses_the_only_chunk_when_single_object_has_imprecise_chunk_id() {
        let chunk = chunk();
        let adapter = OllamaModelAdapter::new(
            FakeOllamaClient::available(
                r#"{"chunk_id":"chunk-1","front":"Pergunta","back":"Resposta"}"#.to_owned(),
            ),
            OllamaModelConfig {
                model: "llama3.2:1b".to_owned(),
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

        assert_eq!(cards[0].chunk_id, chunk.id);
    }

    #[test]
    fn accepts_flashcards_wrapped_in_cards_property() {
        let chunk = chunk();
        let response = format!(
            r#"{{"cards":[{{"chunk_id":"{}","question":"Pergunta","answer":"Resposta"}}]}}"#,
            chunk.id
        );
        let adapter = OllamaModelAdapter::new(
            FakeOllamaClient::available(response),
            OllamaModelConfig {
                model: "llama3.2:1b".to_owned(),
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
        assert_eq!(cards[0].back, "Resposta");
    }

    #[test]
    fn accepts_flashcards_wrapped_in_flashcards_property_with_portuguese_fields() {
        let chunk = chunk();
        let response = format!(
            r#"{{"flashcards":[{{"chunkId":"{}","pergunta":"Pergunta PT","resposta":"Resposta PT"}}]}}"#,
            chunk.id
        );
        let adapter = OllamaModelAdapter::new(
            FakeOllamaClient::available(response),
            OllamaModelConfig {
                model: "llama3.2:1b".to_owned(),
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

        assert_eq!(cards[0].front, "Pergunta PT");
        assert_eq!(cards[0].back, "Resposta PT");
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

        assert_eq!(
            result.unwrap_err(),
            ModelAdapterError::InvalidFlashcards(
                "nao encontrei JSON na resposta. Trecho da resposta: sem json".to_owned()
            )
        );
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
    fn parses_chunked_ollama_http_success_response() {
        let response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nTransfer-Encoding: chunked\r\n\r\n11\r\n{\"response\":\"ok\"}\r\n0\r\n\r\n";

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
