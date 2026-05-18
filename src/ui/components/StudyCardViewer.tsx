import type { StudyCard } from "../../domain/model-adapter";

interface StudyCardViewerProps {
  card: StudyCard;
  isAnswerVisible: boolean;
  isNextDisabled: boolean;
  labels: {
    title: string;
    progress: string;
    revealAnswer: string;
    nextCard: string;
  };
  onRevealAnswer: () => void;
  onNextCard: () => void;
}

export function StudyCardViewer({
  card,
  isAnswerVisible,
  isNextDisabled,
  labels,
  onRevealAnswer,
  onNextCard
}: StudyCardViewerProps) {
  return (
    <article className="card-preview" aria-labelledby="card-preview-title">
      <div className="study-header">
        <h3 id="card-preview-title">{labels.title}</h3>
        <span>{labels.progress}</span>
      </div>
      <p className="card-front">{card.front}</p>
      {isAnswerVisible ? <p className="card-back">{card.back}</p> : null}
      <div className="study-actions">
        <button type="button" onClick={onRevealAnswer}>
          {labels.revealAnswer}
        </button>
        <button type="button" onClick={onNextCard} disabled={isNextDisabled}>
          {labels.nextCard}
        </button>
      </div>
    </article>
  );
}
