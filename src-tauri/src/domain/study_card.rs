use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct StudyCard {
    pub id: Uuid,
    pub book_id: Uuid,
    pub chunk_id: Uuid,
    pub front: String,
    pub back: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Error, Eq, PartialEq)]
pub enum StudyCardError {
    #[error("card front cannot be empty")]
    EmptyFront,
    #[error("card back cannot be empty")]
    EmptyBack,
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
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{StudyCard, StudyCardError};
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
}
