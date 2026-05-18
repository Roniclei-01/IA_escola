import type { StudyCard } from "../../domain/model-adapter";

export type CardReview = "again" | "hard" | "easy";

interface StudyCardViewerProps {
  card: StudyCard;
  isAnswerVisible: boolean;
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
  selectedReview: CardReview | null;
  reviewSchedule: string | null;
  labels: {
    title: string;
    progress: string;
    reviewSummary: string;
    revealAnswer: string;
    previousCard: string;
    nextCard: string;
    again: string;
    hard: string;
    easy: string;
  };
  onRevealAnswer: () => void;
  onPreviousCard: () => void;
  onNextCard: () => void;
  onReviewCard: (review: CardReview) => void;
}

export function StudyCardViewer({
  card,
  isAnswerVisible,
  isPreviousDisabled,
  isNextDisabled,
  selectedReview,
  reviewSchedule,
  labels,
  onRevealAnswer,
  onPreviousCard,
  onNextCard,
  onReviewCard
}: StudyCardViewerProps) {
  return (
    <article className="card-preview" aria-labelledby="card-preview-title">
      <div className="study-header">
        <h3 id="card-preview-title">{labels.title}</h3>
        <span>{labels.progress}</span>
      </div>
      <p className="review-summary">{labels.reviewSummary}</p>
      {reviewSchedule ? <p className="review-schedule">{reviewSchedule}</p> : null}
      <p className="card-front">{card.front}</p>
      {isAnswerVisible ? <p className="card-back">{card.back}</p> : null}
      <div className="review-actions" aria-label={labels.reviewSummary}>
        <button
          type="button"
          aria-pressed={selectedReview === "again"}
          onClick={() => onReviewCard("again")}
        >
          {labels.again}
        </button>
        <button
          type="button"
          aria-pressed={selectedReview === "hard"}
          onClick={() => onReviewCard("hard")}
        >
          {labels.hard}
        </button>
        <button
          type="button"
          aria-pressed={selectedReview === "easy"}
          onClick={() => onReviewCard("easy")}
        >
          {labels.easy}
        </button>
      </div>
      <div className="study-actions">
        <button type="button" className="reveal-answer-button" onClick={onRevealAnswer}>
          {labels.revealAnswer}
        </button>
        <button type="button" onClick={onPreviousCard} disabled={isPreviousDisabled}>
          {labels.previousCard}
        </button>
        <button type="button" onClick={onNextCard} disabled={isNextDisabled}>
          {labels.nextCard}
        </button>
      </div>
    </article>
  );
}
