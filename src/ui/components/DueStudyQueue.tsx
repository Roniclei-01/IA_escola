import type { StudyCard } from "../../domain/model-adapter";

export interface DueStudyQueueItem {
  card: StudyCard;
  priority: number;
  nextReviewAt: number;
}

interface DueStudyQueueProps {
  items: DueStudyQueueItem[];
  labels: {
    title: string;
    summary: string;
    empty: string;
    item: (item: DueStudyQueueItem) => string;
  };
  onSelectCard: (cardId: string) => void;
}

export function DueStudyQueue({ items, labels, onSelectCard }: DueStudyQueueProps) {
  return (
    <section className="due-study-queue" aria-labelledby="due-study-queue-title">
      <h3 id="due-study-queue-title">{labels.title}</h3>
      <p>{items.length > 0 ? labels.summary : labels.empty}</p>

      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item.card.id}>
              <button type="button" onClick={() => onSelectCard(item.card.id)}>
                <span>{labels.item(item)}</span>
                <strong>{item.card.front}</strong>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
