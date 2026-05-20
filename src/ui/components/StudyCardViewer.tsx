import { useEffect, useState } from "react";
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
    multipleChoiceOptions: string;
    correctChoice: string;
    selectedChoice: string;
    explanation: string;
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
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const choices = card.choices ?? [];
  const correctChoiceIndex = card.correctChoiceIndex ?? null;
  const isMultipleChoice =
    card.cardType === "multiple_choice" && choices.length > 0 && correctChoiceIndex !== null;
  const correctChoice =
    isMultipleChoice && correctChoiceIndex >= 0 && correctChoiceIndex < choices.length
      ? choices[correctChoiceIndex]
      : card.back;
  const selectedChoice =
    selectedChoiceIndex !== null && selectedChoiceIndex >= 0 && selectedChoiceIndex < choices.length
      ? choices[selectedChoiceIndex]
      : null;

  useEffect(() => {
    setSelectedChoiceIndex(null);
  }, [card.id]);

  return (
    <article className="card-preview" aria-labelledby="card-preview-title">
      <div className="study-header">
        <h3 id="card-preview-title">{labels.title}</h3>
        <span>{labels.progress}</span>
      </div>
      <p className="review-summary">{labels.reviewSummary}</p>
      {reviewSchedule ? <p className="review-schedule">{reviewSchedule}</p> : null}
      <p className="card-front">{card.front}</p>
      {isMultipleChoice ? (
        <div className="multiple-choice-options" role="group" aria-label={labels.multipleChoiceOptions}>
          {choices.map((choice, index) => {
            const isSelected = selectedChoiceIndex === index;
            const isCorrect = correctChoiceIndex === index;
            const answerState = isAnswerVisible
              ? isCorrect
                ? "correct"
                : isSelected
                  ? "incorrect"
                  : "neutral"
              : "pending";

            return (
              <button
                key={`${card.id}-${index}`}
                type="button"
                className="multiple-choice-option"
                data-answer-state={answerState}
                aria-pressed={isSelected}
                onClick={() => setSelectedChoiceIndex(index)}
              >
                <span className="multiple-choice-option-marker">
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{choice}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {isAnswerVisible ? (
        isMultipleChoice ? (
          <div className="card-back">
            <p>
              <strong>{labels.correctChoice}:</strong> {correctChoice}
            </p>
            {selectedChoice ? (
              <p>
                <strong>{labels.selectedChoice}:</strong> {selectedChoice}
              </p>
            ) : null}
            {card.explanation ? (
              <p>
                <strong>{labels.explanation}:</strong> {card.explanation}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="card-back">{card.back}</p>
        )
      ) : null}
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
