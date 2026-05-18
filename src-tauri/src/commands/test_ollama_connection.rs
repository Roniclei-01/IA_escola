use serde::{Deserialize, Serialize};

use crate::app::{ModelAdapter, ModelAdapterError};

#[cfg(feature = "tauri-app")]
const DEFAULT_OLLAMA_BASE_URL: &str = "http://127.0.0.1:11434";

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct TestOllamaConnectionRequest {
    pub model: String,
    pub base_url: Option<String>,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct TestOllamaConnectionResponse {
    pub ok: bool,
    pub model: String,
    pub response: String,
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn test_ollama_connection(
    request: TestOllamaConnectionRequest,
) -> Result<TestOllamaConnectionResponse, String> {
    use crate::infrastructure::ai::{OllamaHttpClient, OllamaModelAdapter, OllamaModelConfig};

    let adapter = OllamaModelAdapter::new(
        OllamaHttpClient::new(base_url_or_default(request.base_url.clone())),
        OllamaModelConfig {
            model: request.model.clone(),
        },
    );

    test_ollama_connection_with_adapter(request, &adapter)
}

pub fn test_ollama_connection_with_adapter(
    request: TestOllamaConnectionRequest,
    adapter: &dyn ModelAdapter,
) -> Result<TestOllamaConnectionResponse, String> {
    let model = request.model.trim();

    if model.is_empty() {
        return Err("Informe o modelo Ollama.".to_owned());
    }

    let response = adapter
        .generate_text("Responda apenas: ok")
        .map_err(format_model_error)?;

    Ok(TestOllamaConnectionResponse {
        ok: true,
        model: model.to_owned(),
        response,
    })
}

#[cfg(feature = "tauri-app")]
fn base_url_or_default(base_url: Option<String>) -> String {
    base_url
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| DEFAULT_OLLAMA_BASE_URL.to_owned())
}

fn format_model_error(error: ModelAdapterError) -> String {
    match error {
        ModelAdapterError::Unavailable => {
            "Nao foi possivel conectar ao Ollama ou carregar o modelo informado.".to_owned()
        }
        ModelAdapterError::InvalidFlashcards => {
            "O Ollama respondeu em um formato invalido.".to_owned()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        test_ollama_connection_with_adapter, TestOllamaConnectionRequest,
        TestOllamaConnectionResponse,
    };
    use crate::{
        app::{FlashcardConfig, ModelAdapter, ModelAdapterError},
        domain::{DocumentChunk, StudyCard},
    };

    struct FakeModelAdapter {
        result: Result<String, ModelAdapterError>,
    }

    impl ModelAdapter for FakeModelAdapter {
        fn generate_text(&self, _prompt: &str) -> Result<String, ModelAdapterError> {
            self.result.clone()
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
    fn returns_ok_when_model_generates_text() {
        let response = test_ollama_connection_with_adapter(
            TestOllamaConnectionRequest {
                model: "llama3.2".to_owned(),
                base_url: None,
            },
            &FakeModelAdapter {
                result: Ok("ok".to_owned()),
            },
        )
        .unwrap();

        assert_eq!(
            response,
            TestOllamaConnectionResponse {
                ok: true,
                model: "llama3.2".to_owned(),
                response: "ok".to_owned(),
            }
        );
    }

    #[test]
    fn rejects_empty_model() {
        let result = test_ollama_connection_with_adapter(
            TestOllamaConnectionRequest {
                model: " ".to_owned(),
                base_url: None,
            },
            &FakeModelAdapter {
                result: Ok("ok".to_owned()),
            },
        );

        assert_eq!(result.unwrap_err(), "Informe o modelo Ollama.");
    }

    #[test]
    fn formats_unavailable_model_error() {
        let result = test_ollama_connection_with_adapter(
            TestOllamaConnectionRequest {
                model: "llama3.2".to_owned(),
                base_url: None,
            },
            &FakeModelAdapter {
                result: Err(ModelAdapterError::Unavailable),
            },
        );

        assert_eq!(
            result.unwrap_err(),
            "Nao foi possivel conectar ao Ollama ou carregar o modelo informado."
        );
    }
}
