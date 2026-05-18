import { useState, type ReactNode } from "react";
import type { ImportTextBookResponse } from "../../infrastructure/tauri/import-text-book";

const COLLAPSED_PREVIEW_LENGTH = 900;

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
    expandPreview: string;
    collapsePreview: string;
  };
  isGeneratingCards?: boolean;
  onGenerateCards?: () => void;
  children?: ReactNode;
}

export function DocumentSummary({
  document,
  chunkCount,
  cardCount,
  labels,
  isGeneratingCards = false,
  onGenerateCards,
  children
}: DocumentSummaryProps) {
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const shouldCollapsePreview = document.content.length > COLLAPSED_PREVIEW_LENGTH;
  const previewContent =
    shouldCollapsePreview && !isPreviewExpanded
      ? `${document.content.slice(0, COLLAPSED_PREVIEW_LENGTH).trimEnd()}...`
      : document.content;

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
          <button type="button" disabled={isGeneratingCards} onClick={onGenerateCards}>
            {labels.generateCards}
          </button>
        </div>
      ) : null}
      {cardCount > 0 ? children : null}
      <p className="document-content-preview">{previewContent}</p>
      {shouldCollapsePreview ? (
        <button
          className="document-preview-toggle"
          type="button"
          onClick={() => setIsPreviewExpanded((currentValue) => !currentValue)}
        >
          {isPreviewExpanded ? labels.collapsePreview : labels.expandPreview}
        </button>
      ) : null}
    </section>
  );
}
