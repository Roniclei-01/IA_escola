use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

const SECONDS_PER_DAY: i64 = 86_400;

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
    pub priority: u8,
    pub next_review_at: i64,
}

#[derive(Debug, Error, Eq, PartialEq)]
pub enum StudyReviewError {
    #[error("review card id cannot be nil")]
    EmptyCardId,
}

impl StudyReview {
    pub fn new(card_id: Uuid, rating: StudyReviewRating) -> Result<Self, StudyReviewError> {
        Self::new_at(card_id, rating, chrono::Utc::now().timestamp())
    }

    pub fn new_at(
        card_id: Uuid,
        rating: StudyReviewRating,
        reviewed_at: i64,
    ) -> Result<Self, StudyReviewError> {
        if card_id.is_nil() {
            return Err(StudyReviewError::EmptyCardId);
        }

        let (priority, review_delay_seconds) = schedule_for_rating(&rating);

        Ok(Self {
            id: Uuid::new_v4(),
            card_id,
            rating,
            priority,
            next_review_at: reviewed_at + review_delay_seconds,
        })
    }
}

fn schedule_for_rating(rating: &StudyReviewRating) -> (u8, i64) {
    match rating {
        StudyReviewRating::Again => (100, 0),
        StudyReviewRating::Hard => (70, SECONDS_PER_DAY),
        StudyReviewRating::Easy => (20, 7 * SECONDS_PER_DAY),
    }
}

#[cfg(test)]
mod tests {
    use super::{StudyReview, StudyReviewError, StudyReviewRating};
    use uuid::Uuid;

    #[test]
    fn creates_valid_study_review() {
        let card_id = Uuid::new_v4();

        let review = StudyReview::new_at(card_id, StudyReviewRating::Easy, 1_700_000_000).unwrap();

        assert_eq!(review.card_id, card_id);
        assert_eq!(review.rating, StudyReviewRating::Easy);
        assert_eq!(review.priority, 20);
        assert_eq!(review.next_review_at, 1_700_604_800);
    }

    #[test]
    fn schedules_failed_cards_with_high_priority_for_now() {
        let review =
            StudyReview::new_at(Uuid::new_v4(), StudyReviewRating::Again, 1_700_000_000).unwrap();

        assert_eq!(review.priority, 100);
        assert_eq!(review.next_review_at, 1_700_000_000);
    }

    #[test]
    fn schedules_hard_cards_for_tomorrow() {
        let review =
            StudyReview::new_at(Uuid::new_v4(), StudyReviewRating::Hard, 1_700_000_000).unwrap();

        assert_eq!(review.priority, 70);
        assert_eq!(review.next_review_at, 1_700_086_400);
    }

    #[test]
    fn rejects_empty_card_id() {
        let result = StudyReview::new(Uuid::nil(), StudyReviewRating::Again);

        assert_eq!(result.unwrap_err(), StudyReviewError::EmptyCardId);
    }
}
