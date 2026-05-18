use serde::{Deserialize, Serialize};

use crate::{
    app::{generate_flashcards, FlashcardConfig, GenerateFlashcardsError},
    domain::{DocumentChunk, Language, StudyCard},
};

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct GenerateStudyCardsRequest {
    pub chunks: Vec<DocumentChunk>,
    pub cards_per_chunk: usize,
    pub language: Language,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct GenerateStudyCardsResponse {
    pub cards: Vec<StudyCard>,
}

pub fn generate_study_cards_with_adapter(
    request: GenerateStudyCardsRequest,
    adapter: &dyn crate::app::ModelAdapter,
) -> Result<GenerateStudyCardsResponse, String> {
    generate_flashcards(
        &request.chunks,
        FlashcardConfig {
            cards_per_chunk: request.cards_per_chunk,
            language: request.language,
        },
        adapter,
    )
    .map(|cards| GenerateStudyCardsResponse { cards })
    .map_err(format_generate_error)
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn generate_study_cards(
    app_handle: tauri::AppHandle,
    request: GenerateStudyCardsRequest,
) -> Result<GenerateStudyCardsResponse, String> {
    use crate::infrastructure::ai::{OllamaHttpClient, OllamaModelAdapter, OllamaModelConfig};

    let storage = crate::commands::app_storage::open_app_storage(&app_handle)?;
    let settings = crate::commands::ollama_settings::load_ollama_settings_from_storage(&storage)?;
    let adapter = OllamaModelAdapter::new(
        OllamaHttpClient::new(settings.base_url),
        OllamaModelConfig {
            model: settings.model,
        },
    );

    generate_study_cards_with_adapter(request, &adapter)
}

fn format_generate_error(error: GenerateFlashcardsError) -> String {
    match error {
        GenerateFlashcardsError::EmptyChunks => "Nao ha chunks para gerar cards.".to_owned(),
        GenerateFlashcardsError::InvalidCardsPerChunk => {
            "A quantidade de cards por chunk deve ser maior que zero.".to_owned()
        }
        GenerateFlashcardsError::Model(_) => {
            "Nao foi possivel gerar cards com o Ollama. Verifique a conexao e o modelo configurado."
                .to_owned()
        }
    }
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{generate_study_cards_with_adapter, GenerateStudyCardsRequest};
    use crate::{
        app::{FlashcardConfig, ModelAdapter, ModelAdapterError},
        domain::{DocumentChunk, Language, StudyCard},
    };

    struct FakeModelAdapter {
        fail: bool,
    }

    impl ModelAdapter for FakeModelAdapter {
        fn generate_text(&self, prompt: &str) -> Result<String, ModelAdapterError> {
            Ok(prompt.to_owned())
        }

        fn create_flashcards(
            &self,
            chunks: &[DocumentChunk],
            _config: &FlashcardConfig,
        ) -> Result<Vec<StudyCard>, ModelAdapterError> {
            if self.fail {
                return Err(ModelAdapterError::Unavailable);
            }

            chunks
                .iter()
                .map(|chunk| {
                    StudyCard::new(
                        chunk.book_id,
                        chunk.id,
                        "Pergunta gerada",
                        "Resposta gerada",
                        vec!["ollama".to_owned()],
                    )
                    .map_err(|_| ModelAdapterError::InvalidFlashcards)
                })
                .collect()
        }
    }

    fn request() -> GenerateStudyCardsRequest {
        GenerateStudyCardsRequest {
            chunks: vec![
                DocumentChunk::new(Uuid::new_v4(), Uuid::new_v4(), 1, "conteudo").unwrap(),
            ],
            cards_per_chunk: 1,
            language: Language::Pt,
        }
    }

    #[test]
    fn generates_cards_with_adapter() {
        let response =
            generate_study_cards_with_adapter(request(), &FakeModelAdapter { fail: false })
                .unwrap();

        assert_eq!(response.cards.len(), 1);
        assert_eq!(response.cards[0].front, "Pergunta gerada");
        assert_eq!(response.cards[0].tags, vec!["ollama"]);
    }

    #[test]
    fn formats_ollama_failure_for_ui() {
        let result = generate_study_cards_with_adapter(request(), &FakeModelAdapter { fail: true });

        assert_eq!(
            result.unwrap_err(),
            "Nao foi possivel gerar cards com o Ollama. Verifique a conexao e o modelo configurado."
        );
    }
}
