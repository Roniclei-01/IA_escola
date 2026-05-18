use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StudyReviewRating {
    Again,
    Hard,
    Easy,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct StudyReview {
    pub id: Uuid,
    pub card_id: Uuid,
    pub rating: StudyReviewRating,
}

#[derive(Debug, Error, Eq, PartialEq)]
pub enum StudyReviewError {
    #[error("review card id cannot be nil")]
    EmptyCardId,
}

impl StudyReview {
    pub fn new(card_id: Uuid, rating: StudyReviewRating) -> Result<Self, StudyReviewError> {
        if card_id.is_nil() {
            return Err(StudyReviewError::EmptyCardId);
        }

        Ok(Self {
            id: Uuid::new_v4(),
            card_id,
            rating,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{StudyReview, StudyReviewError, StudyReviewRating};
    use uuid::Uuid;

    #[test]
    fn creates_valid_study_review() {
        let card_id = Uuid::new_v4();

        let review = StudyReview::new(card_id, StudyReviewRating::Easy).unwrap();

        assert_eq!(review.card_id, card_id);
        assert_eq!(review.rating, StudyReviewRating::Easy);
    }

    #[test]
    fn rejects_empty_card_id() {
        let result = StudyReview::new(Uuid::nil(), StudyReviewRating::Again);

        assert_eq!(result.unwrap_err(), StudyReviewError::EmptyCardId);
    }
}
