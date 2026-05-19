import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ImportTextBookResponse } from "../../infrastructure/tauri/import-text-book";

const COLLAPSED_PREVIEW_LENGTH = 900;
const READER_PAGE_LENGTH = 2_200;

export interface ReaderPageTranslationRequest {
  pageIndex: number;
  pageContent: string;
}

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
    extractedTextTitle: string;
    extractedTextMeta: (characterCount: number) => string;
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
    previousReaderPage: string;
    nextReaderPage: string;
    readerPageStatus: (currentPage: number, totalPages: number) => string;
  };
  originalLanguage: ImportTextBookResponse["language"];
  readerTargetLanguage: ImportTextBookResponse["language"];
  translatedPagesByIndex: Record<number, string>;
  isGeneratingCards?: boolean;
  isTranslatingDocument?: boolean;
  onGenerateCards?: () => void;
  onReaderTargetLanguageChange: (language: ImportTextBookResponse["language"]) => void;
  onTranslateDocument: (request: ReaderPageTranslationRequest) => void;
  children?: ReactNode;
}

export function DocumentSummary({
  document,
  chunkCount,
  cardCount,
  labels,
  originalLanguage,
  readerTargetLanguage,
  translatedPagesByIndex,
  isGeneratingCards = false,
  isTranslatingDocument = false,
  onGenerateCards,
  onReaderTargetLanguageChange,
  onTranslateDocument,
  children
}: DocumentSummaryProps) {
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [readerPageIndex, setReaderPageIndex] = useState(0);
  const shouldCollapsePreview = document.content.length > COLLAPSED_PREVIEW_LENGTH;
  const previewContent =
    shouldCollapsePreview && !isPreviewExpanded
      ? `${document.content.slice(0, COLLAPSED_PREVIEW_LENGTH).trimEnd()}...`
      : document.content;
  const isSameLanguage = readerTargetLanguage === originalLanguage;
  const originalPages = useMemo(() => paginateReaderText(document.content), [document.content]);
  const totalReaderPages = Math.max(originalPages.length, 1);
  const currentReaderPage = Math.min(readerPageIndex, totalReaderPages - 1);
  const currentOriginalPage = originalPages[currentReaderPage] ?? "";
  const currentTranslatedPage = isSameLanguage
    ? currentOriginalPage
    : translatedPagesByIndex[currentReaderPage] ?? "";

  useEffect(() => {
    setReaderPageIndex(0);
  }, [document.document_id, readerTargetLanguage]);

  function goToPreviousReaderPage() {
    setReaderPageIndex((currentPage) => Math.max(currentPage - 1, 0));
  }

  function goToNextReaderPage() {
    setReaderPageIndex((currentPage) => Math.min(currentPage + 1, totalReaderPages - 1));
  }

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
            onClick={() =>
              onTranslateDocument({
                pageIndex: currentReaderPage,
                pageContent: currentOriginalPage
              })
            }
          >
            {isTranslatingDocument ? labels.translatingDocument : labels.translateDocument}
          </button>
        </div>
        {totalReaderPages > 1 ? (
          <div
            className="reader-pagination"
            aria-label={labels.readerPageStatus(currentReaderPage + 1, totalReaderPages)}
          >
            <button
              type="button"
              disabled={currentReaderPage === 0}
              onClick={goToPreviousReaderPage}
            >
              {labels.previousReaderPage}
            </button>
            <span>{labels.readerPageStatus(currentReaderPage + 1, totalReaderPages)}</span>
            <button
              type="button"
              disabled={currentReaderPage >= totalReaderPages - 1}
              onClick={goToNextReaderPage}
            >
              {labels.nextReaderPage}
            </button>
          </div>
        ) : null}
        {isSameLanguage ? <p className="reader-note">{labels.translationSameLanguage}</p> : null}
        <div className="document-reader-grid">
          <article className="reader-pane">
            <h4>{labels.originalPaneTitle}</h4>
            <p>{currentOriginalPage}</p>
          </article>
          <article className="reader-pane">
            <h4>{labels.translatedPaneTitle}</h4>
            {currentTranslatedPage ? (
              <p>{currentTranslatedPage}</p>
            ) : (
              <p className="reader-placeholder">{labels.translationPlaceholder}</p>
            )}
          </article>
        </div>
      </section>
      {cardCount > 0 ? children : null}
      <section className="document-extracted-text" aria-labelledby="document-extracted-text-title">
        <div>
          <h3 id="document-extracted-text-title">{labels.extractedTextTitle}</h3>
          <span>{labels.extractedTextMeta(document.content.length)}</span>
        </div>
        <button
          className="document-preview-toggle"
          type="button"
          onClick={() => setIsPreviewExpanded((currentValue) => !currentValue)}
        >
          {isPreviewExpanded ? labels.collapsePreview : labels.expandPreview}
        </button>
        {isPreviewExpanded ? (
          <pre className="document-content-preview">{previewContent}</pre>
        ) : null}
      </section>
    </section>
  );
}

function paginateReaderText(content: string): string[] {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return [];
  }

  const pages: string[] = [];
  let currentPage = "";

  for (const block of trimmedContent.split(/(\n\s*\n)/)) {
    if (!block) {
      continue;
    }

    if (block.length > READER_PAGE_LENGTH) {
      if (currentPage.trim()) {
        pages.push(currentPage.trim());
        currentPage = "";
      }
      pages.push(...splitLongReaderBlock(block));
      continue;
    }

    if (currentPage && currentPage.length + block.length > READER_PAGE_LENGTH) {
      pages.push(currentPage.trim());
      currentPage = "";
    }

    currentPage += block;
  }

  if (currentPage.trim()) {
    pages.push(currentPage.trim());
  }

  return pages;
}

function splitLongReaderBlock(block: string): string[] {
  const pages: string[] = [];
  let currentPage = "";

  for (const word of block.split(/\s+/).filter(Boolean)) {
    if (currentPage && currentPage.length + word.length + 1 > READER_PAGE_LENGTH) {
      pages.push(currentPage.trim());
      currentPage = "";
    }

    currentPage = currentPage ? `${currentPage} ${word}` : word;
  }

  if (currentPage.trim()) {
    pages.push(currentPage.trim());
  }

  return pages;
}
