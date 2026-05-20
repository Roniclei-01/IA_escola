import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ImportTextBookResponse } from "../../infrastructure/tauri/import-text-book";
import type { RenderPdfPageResponse } from "../../infrastructure/tauri/render-pdf-page";
import type { TranslationProviderId } from "../../infrastructure/tauri/translate-document";

const COLLAPSED_PREVIEW_LENGTH = 900;
const READER_PAGE_LENGTH = 1_200;

export interface ReaderPageTranslationRequest {
  pageIndex: number;
  pageContent: string;
  totalPages?: number;
  forceRefresh?: boolean;
}

export type ReaderPageTranslationSource = "cache" | "generated";

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
    showOriginalPane: string;
    hideOriginalPane: string;
    translatedPaneTitle: string;
    translationPlaceholder: string;
    translationSameLanguage: string;
    translationStatusCached: string;
    translationStatusGenerated: string;
    translationProviderStatus: (provider: string) => string;
    translationProviderLabel: (provider: TranslationProviderId) => string;
    translateDocument: string;
    retranslateDocument: string;
    translatingDocument: string;
    previousReaderPage: string;
    nextReaderPage: string;
    readerPageStatus: (currentPage: number, totalPages: number) => string;
    readerBookmarkStatus: (currentPage: number, totalPages: number) => string;
    translatedReaderPages: (pages: string) => string;
    pdfReaderTitle: string;
    previousPdfPage: string;
    previousPdfPageLabel: string;
    nextPdfPage: string;
    nextPdfPageLabel: string;
    pdfPageStatus: (currentPage: number, totalPages: number) => string;
    pdfZoomLabel: string;
    pdfPageImageAlt: (page: number) => string;
    renderingPdfPage: string;
  };
  originalLanguage: ImportTextBookResponse["language"];
  readerTargetLanguage: ImportTextBookResponse["language"];
  translatedPagesByIndex: Record<number, string>;
  translatedPageSourcesByIndex: Record<number, ReaderPageTranslationSource>;
  translatedPageProvidersByIndex: Record<number, TranslationProviderId>;
  translatedReaderPageIndexes: number[];
  renderedPdfPage: RenderPdfPageResponse | null;
  isRenderingPdfPage?: boolean;
  readerPage: number;
  pdfReaderPage: number;
  pdfReaderZoom: number;
  isGeneratingCards?: boolean;
  isTranslatingDocument?: boolean;
  onPdfReaderPageChange: (page: number) => void;
  onPdfReaderZoomChange: (zoom: number) => void;
  onGenerateCards?: () => void;
  onReaderTargetLanguageChange: (language: ImportTextBookResponse["language"]) => void;
  onReaderPageChange: (request: ReaderPageTranslationRequest) => void;
  onTranslateDocument: (request: ReaderPageTranslationRequest) => void;
  documentStudyMetadataSlot?: ReactNode;
  meditationSlot?: ReactNode;
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
  translatedPageSourcesByIndex,
  translatedPageProvidersByIndex,
  translatedReaderPageIndexes,
  renderedPdfPage,
  isRenderingPdfPage = false,
  readerPage,
  pdfReaderPage,
  pdfReaderZoom,
  isGeneratingCards = false,
  isTranslatingDocument = false,
  onPdfReaderPageChange,
  onPdfReaderZoomChange,
  onGenerateCards,
  onReaderTargetLanguageChange,
  onReaderPageChange,
  onTranslateDocument,
  documentStudyMetadataSlot,
  meditationSlot,
  children
}: DocumentSummaryProps) {
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isOriginalPaneOpen, setIsOriginalPaneOpen] = useState(false);
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
  const currentTranslationSource = translatedPageSourcesByIndex[currentReaderPage];
  const currentTranslationProvider = translatedPageProvidersByIndex[currentReaderPage];
  const isPdfDocument = document.source_type === "pdf" && Boolean(document.source_path);
  const renderedPageCount = renderedPdfPage?.page_count ?? null;
  const translatedReaderPageLabels = useMemo(
    () =>
      translatedReaderPageIndexes
        .filter((pageIndex) => pageIndex >= 0 && pageIndex < totalReaderPages)
        .map((pageIndex) => String(pageIndex + 1)),
    [totalReaderPages, translatedReaderPageIndexes]
  );

  useEffect(() => {
    const nextReaderPageIndex = Math.min(Math.max(readerPage - 1, 0), totalReaderPages - 1);

    setReaderPageIndex(nextReaderPageIndex);
  }, [document.document_id, readerPage, totalReaderPages]);

  useEffect(() => {
    setIsOriginalPaneOpen(false);
  }, [document.document_id]);

  function goToPreviousReaderPage() {
    const nextPage = Math.max(currentReaderPage - 1, 0);

    setReaderPageIndex(nextPage);
    onReaderPageChange({
      pageIndex: nextPage,
      pageContent: originalPages[nextPage] ?? ""
    });
  }

  function goToNextReaderPage() {
    const nextPage = Math.min(currentReaderPage + 1, totalReaderPages - 1);

    setReaderPageIndex(nextPage);
    onReaderPageChange({
      pageIndex: nextPage,
      pageContent: originalPages[nextPage] ?? ""
    });
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
      {isPdfDocument ? (
        <section className="pdf-page-reader" aria-labelledby="pdf-page-reader-title">
          <div className="pdf-page-reader-header">
            <h3 id="pdf-page-reader-title">{labels.pdfReaderTitle}</h3>
            <div className="pdf-page-controls">
              <span>
                {renderedPageCount
                  ? labels.pdfPageStatus(pdfReaderPage, renderedPageCount)
                  : labels.pdfPageStatus(pdfReaderPage, pdfReaderPage)}
              </span>
              <label htmlFor="pdf-reader-zoom">
                {labels.pdfZoomLabel}
                <select
                  id="pdf-reader-zoom"
                  value={String(pdfReaderZoom)}
                  onChange={(event) => onPdfReaderZoomChange(Number(event.target.value))}
                >
                  <option value="0.85">85%</option>
                  <option value="1">100%</option>
                  <option value="1.25">125%</option>
                  <option value="1.5">150%</option>
                </select>
              </label>
            </div>
          </div>
          {isRenderingPdfPage ? (
            <p className="pdf-page-status" role="status">
              {labels.renderingPdfPage}
            </p>
          ) : null}
          {renderedPdfPage ? (
            <div className="pdf-page-frame">
              <img
                alt={labels.pdfPageImageAlt(renderedPdfPage.page)}
                src={renderedPdfPage.image_data_url}
                style={{ width: `${Math.round(pdfReaderZoom * 100)}%` }}
              />
            </div>
          ) : null}
          <div className="pdf-page-footer-controls">
            <button
              type="button"
              aria-label={labels.previousPdfPageLabel}
              title={labels.previousPdfPageLabel}
              disabled={isRenderingPdfPage || pdfReaderPage <= 1}
              onClick={() => onPdfReaderPageChange(Math.max(pdfReaderPage - 1, 1))}
            >
              {labels.previousPdfPage}
            </button>
            <span>
              {renderedPageCount
                ? labels.pdfPageStatus(pdfReaderPage, renderedPageCount)
                : labels.pdfPageStatus(pdfReaderPage, pdfReaderPage)}
            </span>
            <button
              type="button"
              aria-label={labels.nextPdfPageLabel}
              title={labels.nextPdfPageLabel}
              disabled={
                isRenderingPdfPage ||
                (renderedPageCount !== null && pdfReaderPage >= renderedPageCount)
              }
              onClick={() => onPdfReaderPageChange(pdfReaderPage + 1)}
            >
              {labels.nextPdfPage}
            </button>
          </div>
        </section>
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
                pageContent: currentOriginalPage,
                totalPages: totalReaderPages,
                forceRefresh: Boolean(currentTranslatedPage)
              })
            }
          >
            {isTranslatingDocument
              ? labels.translatingDocument
              : currentTranslatedPage && !isSameLanguage
                ? labels.retranslateDocument
                : labels.translateDocument}
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
            <em>{labels.readerBookmarkStatus(currentReaderPage + 1, totalReaderPages)}</em>
          </div>
        ) : null}
        {!isSameLanguage && translatedReaderPageLabels.length > 0 ? (
          <p className="reader-translated-pages">
            {labels.translatedReaderPages(translatedReaderPageLabels.join(", "))}
          </p>
        ) : null}
        {isSameLanguage ? <p className="reader-note">{labels.translationSameLanguage}</p> : null}
        {currentTranslatedPage && !isSameLanguage ? (
          <p className="reader-translation-status">
            <span>
              {currentTranslationSource === "cache"
                ? labels.translationStatusCached
                : labels.translationStatusGenerated}
            </span>
            {currentTranslationSource === "generated" &&
            currentTranslationProvider &&
            currentTranslationProvider !== "unknown" ? (
              <span>
                {labels.translationProviderStatus(
                  labels.translationProviderLabel(currentTranslationProvider)
                )}
              </span>
            ) : null}
          </p>
        ) : null}
        <div className="document-reader-grid">
          <article
            className={`reader-pane reader-pane-original ${
              isOriginalPaneOpen ? "" : "reader-pane-collapsed"
            }`}
          >
            <button
              type="button"
              className="reader-pane-toggle"
              aria-expanded={isOriginalPaneOpen}
              aria-label={isOriginalPaneOpen ? labels.hideOriginalPane : labels.showOriginalPane}
              onClick={() => setIsOriginalPaneOpen((currentValue) => !currentValue)}
            >
              <span className="reader-pane-toggle-arrow" aria-hidden="true" />
            </button>
            {isOriginalPaneOpen ? (
              <>
                <h4>{labels.originalPaneTitle}</h4>
                <p>{currentOriginalPage}</p>
              </>
            ) : null}
          </article>
          <article className="reader-pane reader-pane-translated">
            <div className="reader-pane-heading">
              <h4>{labels.translatedPaneTitle}</h4>
              {meditationSlot ? <div className="reader-pane-tools">{meditationSlot}</div> : null}
            </div>
            {currentTranslatedPage ? (
              <p>{currentTranslatedPage}</p>
            ) : (
              <p className="reader-placeholder">{labels.translationPlaceholder}</p>
            )}
          </article>
        </div>
      </section>
      {documentStudyMetadataSlot}
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
