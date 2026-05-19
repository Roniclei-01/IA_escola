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
    readerTitle: string;
    readerLanguageLabel: string;
    readerPortuguese: string;
    readerEnglish: string;
    readerSpanish: string;
    originalPaneTitle: string;
    translatedPaneTitle: string;
    translationPlaceholder: string;
    translationSameLanguage: string;
    translateDocument: string;
    translatingDocument: string;
  };
  originalLanguage: ImportTextBookResponse["language"];
  readerTargetLanguage: ImportTextBookResponse["language"];
  translatedContent: string | null;
  isGeneratingCards?: boolean;
  isTranslatingDocument?: boolean;
  onGenerateCards?: () => void;
  onReaderTargetLanguageChange: (language: ImportTextBookResponse["language"]) => void;
  onTranslateDocument: () => void;
  children?: ReactNode;
}

export function DocumentSummary({
  document,
  chunkCount,
  cardCount,
  labels,
  originalLanguage,
  readerTargetLanguage,
  translatedContent,
  isGeneratingCards = false,
  isTranslatingDocument = false,
  onGenerateCards,
  onReaderTargetLanguageChange,
  onTranslateDocument,
  children
}: DocumentSummaryProps) {
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const shouldCollapsePreview = document.content.length > COLLAPSED_PREVIEW_LENGTH;
  const previewContent =
    shouldCollapsePreview && !isPreviewExpanded
      ? `${document.content.slice(0, COLLAPSED_PREVIEW_LENGTH).trimEnd()}...`
      : document.content;
  const isSameLanguage = readerTargetLanguage === originalLanguage;
  const translatedDisplayContent = isSameLanguage ? document.content : translatedContent;

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
      <section className="document-reader" aria-labelledby="document-reader-title">
        <div className="document-reader-header">
          <h3 id="document-reader-title">{labels.readerTitle}</h3>
          <label htmlFor="reader-target-language">
            {labels.readerLanguageLabel}
            <select
              id="reader-target-language"
              value={readerTargetLanguage}
              disabled={isTranslatingDocument}
              onChange={(event) =>
                onReaderTargetLanguageChange(event.target.value as ImportTextBookResponse["language"])
              }
            >
              <option value="Pt">{labels.readerPortuguese}</option>
              <option value="En">{labels.readerEnglish}</option>
              <option value="Es">{labels.readerSpanish}</option>
            </select>
          </label>
          <button
            type="button"
            disabled={isTranslatingDocument || isSameLanguage}
            onClick={onTranslateDocument}
          >
            {isTranslatingDocument ? labels.translatingDocument : labels.translateDocument}
          </button>
        </div>
        {isSameLanguage ? <p className="reader-note">{labels.translationSameLanguage}</p> : null}
        <div className="document-reader-grid">
          <article className="reader-pane">
            <h4>{labels.originalPaneTitle}</h4>
            <p>{document.content}</p>
          </article>
          <article className="reader-pane">
            <h4>{labels.translatedPaneTitle}</h4>
            {translatedDisplayContent ? (
              <p>{translatedDisplayContent}</p>
            ) : (
              <p className="reader-placeholder">{labels.translationPlaceholder}</p>
            )}
          </article>
        </div>
      </section>
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
