use std::{
    io::{Read, Write},
    net::TcpStream,
    time::Duration,
};

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    app::{TranslationProvider, TranslationProviderError},
    domain::Language,
};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LibreTranslateHttpClient {
    base_url: String,
    timeout: Duration,
}

impl LibreTranslateHttpClient {
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
pub struct LibreTranslateRequest {
    pub q: String,
    pub source: String,
    pub target: String,
    pub format: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize)]
pub struct LibreTranslateResponse {
    #[serde(rename = "translatedText")]
    pub translated_text: String,
}

#[derive(Clone, Debug, Error, Eq, PartialEq)]
pub enum LibreTranslateClientError {
    #[error("libretranslate base URL is invalid")]
    InvalidBaseUrl,
    #[error("libretranslate is unavailable")]
    Unavailable,
    #[error("libretranslate returned HTTP status {0}")]
    HttpStatus(u16),
    #[error("libretranslate returned an invalid response")]
    InvalidResponse,
}

pub trait LibreTranslateClient {
    fn translate(
        &self,
        request: LibreTranslateRequest,
    ) -> Result<LibreTranslateResponse, LibreTranslateClientError>;
}

impl LibreTranslateClient for LibreTranslateHttpClient {
    fn translate(
        &self,
        request: LibreTranslateRequest,
    ) -> Result<LibreTranslateResponse, LibreTranslateClientError> {
        let endpoint = LibreTranslateEndpoint::parse(&self.base_url)?;
        let body = serde_json::to_string(&request)
            .map_err(|_| LibreTranslateClientError::InvalidResponse)?;
        let mut stream = TcpStream::connect(endpoint.address())
            .map_err(|_| LibreTranslateClientError::Unavailable)?;

        stream
            .set_read_timeout(Some(self.timeout))
            .map_err(|_| LibreTranslateClientError::Unavailable)?;
        stream
            .set_write_timeout(Some(self.timeout))
            .map_err(|_| LibreTranslateClientError::Unavailable)?;

        let http_request = format!(
            "POST {path}/translate HTTP/1.1\r\n\
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
            .map_err(|_| LibreTranslateClientError::Unavailable)?;

        let mut response = String::new();
        stream
            .read_to_string(&mut response)
            .map_err(|_| LibreTranslateClientError::Unavailable)?;

        parse_http_translate_response(&response)
    }
}

pub struct LibreTranslateProvider<C> {
    client: C,
}

impl<C> LibreTranslateProvider<C> {
    pub fn new(client: C) -> Self {
        Self { client }
    }
}

impl<C> TranslationProvider for LibreTranslateProvider<C>
where
    C: LibreTranslateClient,
{
    fn translate_text(
        &self,
        text: &str,
        source_language: Language,
        target_language: Language,
    ) -> Result<String, TranslationProviderError> {
        let response = self
            .client
            .translate(LibreTranslateRequest {
                q: text.to_owned(),
                source: language_code(source_language).to_owned(),
                target: language_code(target_language).to_owned(),
                format: "text".to_owned(),
            })
            .map_err(map_client_error)?;
        let translated_text = response.translated_text.trim().to_owned();

        if translated_text.is_empty() {
            return Err(TranslationProviderError::InvalidResponse(
                "resposta vazia do LibreTranslate".to_owned(),
            ));
        }

        Ok(translated_text)
    }
}

#[derive(Debug)]
struct LibreTranslateEndpoint {
    host: String,
    port: u16,
    path_prefix: String,
}

impl LibreTranslateEndpoint {
    fn parse(base_url: &str) -> Result<Self, LibreTranslateClientError> {
        let without_scheme = base_url
            .trim()
            .strip_prefix("http://")
            .ok_or(LibreTranslateClientError::InvalidBaseUrl)?;
        let (authority, path_prefix) = without_scheme
            .split_once('/')
            .map(|(authority, path)| (authority, format!("/{}", path.trim_end_matches('/'))))
            .unwrap_or((without_scheme, String::new()));

        if authority.is_empty() {
            return Err(LibreTranslateClientError::InvalidBaseUrl);
        }

        let (host, port) = authority
            .rsplit_once(':')
            .map(|(host, port)| {
                let port = port
                    .parse::<u16>()
                    .map_err(|_| LibreTranslateClientError::InvalidBaseUrl)?;

                Ok((host.to_owned(), port))
            })
            .unwrap_or_else(|| Ok((authority.to_owned(), 80)))?;

        if host.is_empty() {
            return Err(LibreTranslateClientError::InvalidBaseUrl);
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

fn parse_http_translate_response(
    response: &str,
) -> Result<LibreTranslateResponse, LibreTranslateClientError> {
    let (head, body) = response
        .split_once("\r\n\r\n")
        .ok_or(LibreTranslateClientError::InvalidResponse)?;
    let status_line = head
        .lines()
        .next()
        .ok_or(LibreTranslateClientError::InvalidResponse)?;
    let status = status_line
        .split_whitespace()
        .nth(1)
        .ok_or(LibreTranslateClientError::InvalidResponse)?
        .parse::<u16>()
        .map_err(|_| LibreTranslateClientError::InvalidResponse)?;

    if !(200..300).contains(&status) {
        return Err(LibreTranslateClientError::HttpStatus(status));
    }

    let body = if has_chunked_transfer_encoding(head) {
        decode_chunked_body(body)?
    } else {
        body.to_owned()
    };

    serde_json::from_str(&body).map_err(|_| LibreTranslateClientError::InvalidResponse)
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

fn decode_chunked_body(body: &str) -> Result<String, LibreTranslateClientError> {
    let mut remaining = body;
    let mut decoded = String::new();

    loop {
        let (size_line, rest) = remaining
            .split_once("\r\n")
            .ok_or(LibreTranslateClientError::InvalidResponse)?;
        let size_hex = size_line
            .split_once(';')
            .map(|(size, _)| size)
            .unwrap_or(size_line);
        let size = usize::from_str_radix(size_hex.trim(), 16)
            .map_err(|_| LibreTranslateClientError::InvalidResponse)?;

        if size == 0 {
            return Ok(decoded);
        }

        if rest.len() < size + 2 {
            return Err(LibreTranslateClientError::InvalidResponse);
        }

        let (chunk, rest) = rest.split_at(size);
        decoded.push_str(chunk);

        if !rest.starts_with("\r\n") {
            return Err(LibreTranslateClientError::InvalidResponse);
        }

        remaining = &rest[2..];
    }
}

fn language_code(language: Language) -> &'static str {
    match language {
        Language::Pt => "pt",
        Language::En => "en",
        Language::Es => "es",
    }
}

fn map_client_error(error: LibreTranslateClientError) -> TranslationProviderError {
    match error {
        LibreTranslateClientError::InvalidBaseUrl => TranslationProviderError::Unavailable,
        LibreTranslateClientError::Unavailable => TranslationProviderError::Unavailable,
        LibreTranslateClientError::HttpStatus(_) => TranslationProviderError::Unavailable,
        LibreTranslateClientError::InvalidResponse => TranslationProviderError::InvalidResponse(
            "resposta HTTP invalida do LibreTranslate".to_owned(),
        ),
    }
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use super::{
        parse_http_translate_response, LibreTranslateClient, LibreTranslateClientError,
        LibreTranslateProvider, LibreTranslateRequest, LibreTranslateResponse,
    };
    use crate::{
        app::{TranslationProvider, TranslationProviderError},
        domain::Language,
    };

    struct FakeLibreTranslateClient {
        result: Result<LibreTranslateResponse, LibreTranslateClientError>,
        requests: RefCell<Vec<LibreTranslateRequest>>,
    }

    impl LibreTranslateClient for FakeLibreTranslateClient {
        fn translate(
            &self,
            request: LibreTranslateRequest,
        ) -> Result<LibreTranslateResponse, LibreTranslateClientError> {
            self.requests.borrow_mut().push(request);

            self.result.clone()
        }
    }

    #[test]
    fn translates_text_with_libretranslate_language_codes() {
        let client = FakeLibreTranslateClient {
            result: Ok(LibreTranslateResponse {
                translated_text: "Texto traduzido.".to_owned(),
            }),
            requests: RefCell::new(Vec::new()),
        };
        let provider = LibreTranslateProvider::new(client);

        let translated = provider
            .translate_text("Original text.", Language::En, Language::Pt)
            .unwrap();

        assert_eq!(translated, "Texto traduzido.");
        let requests = provider.client.requests.borrow();
        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0].q, "Original text.");
        assert_eq!(requests[0].source, "en");
        assert_eq!(requests[0].target, "pt");
        assert_eq!(requests[0].format, "text");
    }

    #[test]
    fn maps_empty_libretranslate_response_to_invalid_provider_response() {
        let client = FakeLibreTranslateClient {
            result: Ok(LibreTranslateResponse {
                translated_text: "   ".to_owned(),
            }),
            requests: RefCell::new(Vec::new()),
        };
        let provider = LibreTranslateProvider::new(client);

        let result = provider.translate_text("Original text.", Language::En, Language::Pt);

        assert_eq!(
            result.unwrap_err(),
            TranslationProviderError::InvalidResponse(
                "resposta vazia do LibreTranslate".to_owned()
            )
        );
    }

    #[test]
    fn maps_libretranslate_unavailable_to_provider_unavailable() {
        let client = FakeLibreTranslateClient {
            result: Err(LibreTranslateClientError::Unavailable),
            requests: RefCell::new(Vec::new()),
        };
        let provider = LibreTranslateProvider::new(client);

        let result = provider.translate_text("Original text.", Language::En, Language::Pt);

        assert_eq!(result.unwrap_err(), TranslationProviderError::Unavailable);
    }

    #[test]
    fn parses_successful_http_translation_response() {
        let response = concat!(
            "HTTP/1.1 200 OK\r\n",
            "Content-Type: application/json\r\n",
            "Content-Length: 37\r\n",
            "\r\n",
            r#"{"translatedText":"Texto traduzido."}"#
        );

        let parsed = parse_http_translate_response(response).unwrap();

        assert_eq!(parsed.translated_text, "Texto traduzido.");
    }

    #[test]
    fn rejects_http_translation_error_status() {
        let response = concat!(
            "HTTP/1.1 500 Internal Server Error\r\n",
            "Content-Length: 2\r\n",
            "\r\n",
            "{}"
        );

        let result = parse_http_translate_response(response);

        assert_eq!(
            result.unwrap_err(),
            LibreTranslateClientError::HttpStatus(500)
        );
    }
}
