use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

const MULTIPLE_CHOICE_OPTION_COUNT: usize = 4;

#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StudyCardType {
    #[default]
    Basic,
    MultipleChoice,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct StudyCard {
    pub id: Uuid,
    pub book_id: Uuid,
    pub chunk_id: Uuid,
    pub front: String,
    pub back: String,
    pub tags: Vec<String>,
    #[serde(default)]
    pub card_type: StudyCardType,
    #[serde(default)]
    pub choices: Vec<String>,
    #[serde(default)]
    pub correct_choice_index: Option<usize>,
    #[serde(default)]
    pub explanation: Option<String>,
}

#[derive(Debug, Error, Eq, PartialEq)]
pub enum StudyCardError {
    #[error("card front cannot be empty")]
    EmptyFront,
    #[error("card back cannot be empty")]
    EmptyBack,
    #[error("multiple choice card must have exactly four choices")]
    InvalidChoiceCount,
    #[error("multiple choice card choice cannot be empty")]
    EmptyChoice,
    #[error("multiple choice card choices must be unique")]
    DuplicateChoice,
    #[error("multiple choice card choice cannot be a generic placeholder")]
    GenericChoicePlaceholder,
    #[error("multiple choice card correct choice index is invalid")]
    InvalidCorrectChoiceIndex,
    #[error("multiple choice card must use multiple choice metadata")]
    InvalidMultipleChoiceMetadata,
}

impl StudyCard {
    pub fn new(
        book_id: Uuid,
        chunk_id: Uuid,
        front: impl Into<String>,
        back: impl Into<String>,
        tags: Vec<String>,
    ) -> Result<Self, StudyCardError> {
        let front = front.into().trim().to_owned();
        let back = back.into().trim().to_owned();

        if front.is_empty() {
            return Err(StudyCardError::EmptyFront);
        }

        if back.is_empty() {
            return Err(StudyCardError::EmptyBack);
        }

        Ok(Self {
            id: Uuid::new_v4(),
            book_id,
            chunk_id,
            front,
            back,
            tags,
            card_type: StudyCardType::Basic,
            choices: Vec::new(),
            correct_choice_index: None,
            explanation: None,
        })
    }

    pub fn new_multiple_choice(
        book_id: Uuid,
        chunk_id: Uuid,
        front: impl Into<String>,
        choices: Vec<String>,
        correct_choice_index: usize,
        explanation: Option<String>,
        tags: Vec<String>,
    ) -> Result<Self, StudyCardError> {
        let front = front.into().trim().to_owned();

        if front.is_empty() {
            return Err(StudyCardError::EmptyFront);
        }

        let choices = normalize_choices(choices)?;

        if correct_choice_index >= choices.len() {
            return Err(StudyCardError::InvalidCorrectChoiceIndex);
        }

        let back = choices[correct_choice_index].clone();
        let explanation = explanation
            .map(|value| value.trim().to_owned())
            .filter(|value| !value.is_empty());

        Ok(Self {
            id: Uuid::new_v4(),
            book_id,
            chunk_id,
            front,
            back,
            tags,
            card_type: StudyCardType::MultipleChoice,
            choices,
            correct_choice_index: Some(correct_choice_index),
            explanation,
        })
    }

    pub fn validate(&self) -> Result<(), StudyCardError> {
        if self.front.trim().is_empty() {
            return Err(StudyCardError::EmptyFront);
        }

        if self.back.trim().is_empty() {
            return Err(StudyCardError::EmptyBack);
        }

        match self.card_type {
            StudyCardType::Basic => Ok(()),
            StudyCardType::MultipleChoice => {
                normalize_choices(self.choices.clone())?;
                let correct_choice_index = self
                    .correct_choice_index
                    .ok_or(StudyCardError::InvalidMultipleChoiceMetadata)?;

                if correct_choice_index >= self.choices.len() {
                    return Err(StudyCardError::InvalidCorrectChoiceIndex);
                }

                Ok(())
            }
        }
    }
}

fn normalize_choices(choices: Vec<String>) -> Result<Vec<String>, StudyCardError> {
    if choices.len() != MULTIPLE_CHOICE_OPTION_COUNT {
        return Err(StudyCardError::InvalidChoiceCount);
    }

    let normalized_choices = choices
        .into_iter()
        .map(|choice| strip_choice_label_prefix(&choice))
        .collect::<Vec<_>>();

    if normalized_choices.iter().any(|choice| choice.is_empty()) {
        return Err(StudyCardError::EmptyChoice);
    }

    if normalized_choices
        .iter()
        .any(|choice| is_generic_choice_placeholder(choice))
    {
        return Err(StudyCardError::GenericChoicePlaceholder);
    }

    let mut unique_choices = std::collections::HashSet::new();

    for choice in &normalized_choices {
        if !unique_choices.insert(choice.to_lowercase()) {
            return Err(StudyCardError::DuplicateChoice);
        }
    }

    Ok(normalized_choices)
}

fn is_generic_choice_placeholder(choice: &str) -> bool {
    let normalized = choice
        .trim()
        .to_lowercase()
        .replace(['.', ':', '-', '_'], " ");
    let words = normalized.split_whitespace().collect::<Vec<_>>();

    if words.len() != 2 {
        return false;
    }

    let prefix = words[0];
    let suffix = words[1];

    matches!(
        prefix,
        "alternativa" | "opcao" | "opção" | "alternative" | "option" | "resposta" | "answer"
    ) && matches!(suffix, "a" | "b" | "c" | "d")
}

fn strip_choice_label_prefix(choice: &str) -> String {
    let trimmed = choice.trim();
    let separators = [":", ".", ")", "-", "–"];
    let lower = trimmed.to_lowercase();
    let prefixes = [
        "alternativa",
        "opcao",
        "opção",
        "alternative",
        "option",
        "resposta",
        "answer",
    ];

    for prefix in prefixes {
        for letter in ["a", "b", "c", "d"] {
            for separator in separators {
                let marker = format!("{prefix} {letter}{separator}");

                if lower.starts_with(&marker) {
                    let candidate = trimmed[marker.len()..].trim();

                    if !candidate.is_empty() {
                        return candidate.to_owned();
                    }
                }
            }
        }
    }

    for letter in ["a", "b", "c", "d"] {
        for separator in separators {
            let marker = format!("{letter}{separator}");

            if lower.starts_with(&marker) {
                let candidate = trimmed[marker.len()..].trim();

                if !candidate.is_empty() {
                    return candidate.to_owned();
                }
            }
        }
    }

    trimmed.to_owned()
}

#[cfg(test)]
mod tests {
    use super::{StudyCard, StudyCardError, StudyCardType};
    use uuid::Uuid;

    #[test]
    fn creates_valid_study_card() {
        let card = StudyCard::new(
            Uuid::new_v4(),
            Uuid::new_v4(),
            "O que e revisao espacada?",
            "Uma tecnica de revisao com intervalos crescentes.",
            vec!["memoria".to_owned()],
        )
        .unwrap();

        assert_eq!(card.front, "O que e revisao espacada?");
        assert_eq!(card.tags, vec!["memoria"]);
        assert_eq!(card.card_type, StudyCardType::Basic);
        assert!(card.choices.is_empty());
        assert_eq!(card.correct_choice_index, None);
    }

    #[test]
    fn rejects_empty_front() {
        let result = StudyCard::new(Uuid::new_v4(), Uuid::new_v4(), " ", "Resposta", vec![]);

        assert_eq!(result.unwrap_err(), StudyCardError::EmptyFront);
    }

    #[test]
    fn rejects_empty_back() {
        let result = StudyCard::new(Uuid::new_v4(), Uuid::new_v4(), "Pergunta", " ", vec![]);

        assert_eq!(result.unwrap_err(), StudyCardError::EmptyBack);
    }

    #[test]
    fn creates_valid_multiple_choice_card() {
        let card = StudyCard::new_multiple_choice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            "Qual conceito define revisao com intervalos crescentes?",
            vec![
                "Revisao espacada".to_owned(),
                "Leitura linear".to_owned(),
                "Resumo livre".to_owned(),
                "Memorizacao passiva".to_owned(),
            ],
            0,
            Some("A revisao espacada usa intervalos maiores entre revisoes.".to_owned()),
            vec!["memoria".to_owned()],
        )
        .unwrap();

        assert_eq!(card.card_type, StudyCardType::MultipleChoice);
        assert_eq!(card.back, "Revisao espacada");
        assert_eq!(card.correct_choice_index, Some(0));
        assert_eq!(
            card.explanation.as_deref(),
            Some("A revisao espacada usa intervalos maiores entre revisoes.")
        );
        assert_eq!(card.choices.len(), 4);
        assert!(card.validate().is_ok());
    }

    #[test]
    fn strips_redundant_multiple_choice_labels() {
        let card = StudyCard::new_multiple_choice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            "Qual protocolo confirma entrega?",
            vec![
                "Alternativa A: TCP".to_owned(),
                "Alternativa B: UDP".to_owned(),
                "C) ARP".to_owned(),
                "D. ICMP".to_owned(),
            ],
            0,
            Some("TCP confirma a entrega.".to_owned()),
            vec!["redes".to_owned()],
        )
        .unwrap();

        assert_eq!(card.choices, vec!["TCP", "UDP", "ARP", "ICMP"]);
        assert_eq!(card.back, "TCP");
    }

    #[test]
    fn rejects_multiple_choice_without_four_choices() {
        let result = StudyCard::new_multiple_choice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            "Pergunta",
            vec!["A".to_owned(), "B".to_owned(), "C".to_owned()],
            0,
            None,
            vec![],
        );

        assert_eq!(result.unwrap_err(), StudyCardError::InvalidChoiceCount);
    }

    #[test]
    fn rejects_multiple_choice_with_invalid_correct_choice_index() {
        let result = StudyCard::new_multiple_choice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            "Pergunta",
            vec![
                "TCP".to_owned(),
                "UDP".to_owned(),
                "ARP".to_owned(),
                "ICMP".to_owned(),
            ],
            4,
            None,
            vec![],
        );

        assert_eq!(
            result.unwrap_err(),
            StudyCardError::InvalidCorrectChoiceIndex
        );
    }

    #[test]
    fn rejects_multiple_choice_with_duplicated_choices() {
        let result = StudyCard::new_multiple_choice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            "Pergunta",
            vec![
                "TCP".to_owned(),
                "UDP".to_owned(),
                "tcp".to_owned(),
                "ICMP".to_owned(),
            ],
            0,
            None,
            vec![],
        );

        assert_eq!(result.unwrap_err(), StudyCardError::DuplicateChoice);
    }

    #[test]
    fn rejects_multiple_choice_with_generic_placeholder_choices() {
        let result = StudyCard::new_multiple_choice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            "Pergunta",
            vec![
                "Alternativa A".to_owned(),
                "Alternativa B".to_owned(),
                "Alternativa C".to_owned(),
                "Alternativa D".to_owned(),
            ],
            0,
            None,
            vec![],
        );

        assert_eq!(
            result.unwrap_err(),
            StudyCardError::GenericChoicePlaceholder
        );
    }
}
