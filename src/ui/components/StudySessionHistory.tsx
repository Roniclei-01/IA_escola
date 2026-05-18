import type { StudySessionSummary } from "../../infrastructure/tauri/study-sessions";

interface StudySessionHistoryProps {
  summaries: StudySessionSummary[];
  labels: {
    title: string;
    empty: string;
    exportReport: string;
    itemLabel: (summary: StudySessionSummary, index: number) => string;
    itemCounts: (summary: StudySessionSummary) => string;
  };
  onExportReport: () => void;
}

export function StudySessionHistory({ summaries, labels, onExportReport }: StudySessionHistoryProps) {
  const latestSummaries = summaries.slice(-5).reverse();
  const hasSummaries = summaries.length > 0;

  return (
    <section className="session-history" aria-labelledby="session-history-title">
      <div className="session-history-header">
        <h3 id="session-history-title">{labels.title}</h3>
        <button type="button" disabled={!hasSummaries} onClick={onExportReport}>
          {labels.exportReport}
        </button>
      </div>
      {latestSummaries.length === 0 ? <p>{labels.empty}</p> : null}
      {latestSummaries.length > 0 ? (
        <ul>
          {latestSummaries.map((summary, index) => (
            <li key={summary.session_id}>
              <span>{labels.itemLabel(summary, latestSummaries.length - index)}</span>
              <strong>{labels.itemCounts(summary)}</strong>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
