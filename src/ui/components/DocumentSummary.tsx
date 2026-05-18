import type { ReactNode } from "react";
import type { ImportTextBookResponse } from "../../infrastructure/tauri/import-text-book";

interface DocumentSummaryProps {
  document: ImportTextBookResponse;
  chunkCount: number | null;
  cardCount: number;
  labels: {
    importedDocument: string;
    documentTitle: string;
    sourceType: string;
    sourcePath: string;
    chunkCount: string | null;
    cardCount: string;
    generateCards: string;
  };
  onGenerateCards?: () => void;
  children?: ReactNode;
}

export function DocumentSummary({
  document,
  chunkCount,
  cardCount,
  labels,
  onGenerateCards,
  children
}: DocumentSummaryProps) {
  return (
    <section className="document-preview" aria-labelledby="document-title">
      <div>
        <p className="eyebrow">{labels.importedDocument}</p>
        <h2 id="document-title">{labels.documentTitle}</h2>
      </div>
      <div className="document-metadata">
        <span>{labels.sourceType}</span>
        {document.source_path ? <span>{labels.sourcePath}</span> : null}
      </div>
      {chunkCount !== null && labels.chunkCount ? (
        <p className="chunk-count">{labels.chunkCount}</p>
      ) : null}
      <p className="card-count">{labels.cardCount}</p>
      {cardCount === 0 && onGenerateCards ? (
        <div className="document-actions document-actions-empty">
          <button type="button" onClick={onGenerateCards}>
            {labels.generateCards}
          </button>
        </div>
      ) : null}
      <p>{document.content}</p>
      {cardCount > 0 ? children : null}
    </section>
  );
}
