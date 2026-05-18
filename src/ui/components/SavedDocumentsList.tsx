import type { ImportTextBookResponse } from "../../infrastructure/tauri/import-text-book";

interface SavedDocumentsListProps {
  documents: ImportTextBookResponse[];
  isLoading: boolean;
  isInteractionDisabled?: boolean;
  filters: {
    sourceType: "all" | "txt" | "pdf";
    reviewStatus: "all" | "reviewed" | "pending";
    searchQuery: string;
    sortMode: "oldest" | "newest" | "type" | "status";
  };
  labels: {
    title: string;
    loading: string;
    empty: string;
    noFilterResults: string;
    searchLabel: string;
    searchPlaceholder: string;
    searchAction: string;
    sourceFilterLabel: string;
    allSourceTypes: string;
    reviewStatusFilterLabel: string;
    allReviewStatuses: string;
    reviewed: string;
    pendingReview: string;
    sortLabel: string;
    oldestFirst: string;
    newestFirst: string;
    sortByType: string;
    sortByStatus: string;
    archive: string;
    itemLabel: (index: number) => string;
    sourceType: (sourceType: ImportTextBookResponse["source_type"]) => string;
  };
  onSearchQueryChange: (query: string) => void;
  onSourceTypeFilterChange: (sourceType: "all" | "txt" | "pdf") => void;
  onReviewStatusFilterChange: (reviewStatus: "all" | "reviewed" | "pending") => void;
  onSortModeChange: (sortMode: "oldest" | "newest" | "type" | "status") => void;
  onSelectDocument: (document: ImportTextBookResponse) => void;
  onArchiveDocument: (document: ImportTextBookResponse) => void;
}

export function SavedDocumentsList({
  documents,
  isLoading,
  isInteractionDisabled = false,
  filters,
  labels,
  onSearchQueryChange,
  onSourceTypeFilterChange,
  onReviewStatusFilterChange,
  onSortModeChange,
  onSelectDocument,
  onArchiveDocument
}: SavedDocumentsListProps) {
  const hasActiveFilters =
    filters.sourceType !== "all" ||
    filters.reviewStatus !== "all" ||
    filters.searchQuery.trim().length > 0;

  return (
    <section className="saved-documents" aria-labelledby="saved-documents-title">
      <h2 id="saved-documents-title">{labels.title}</h2>
      <div className="library-filters">
        <label htmlFor="library-search">{labels.searchLabel}</label>
        <div className="library-search-row">
          <input
            id="library-search"
            type="search"
            value={filters.searchQuery}
            placeholder={labels.searchPlaceholder}
            disabled={isInteractionDisabled}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSearchQueryChange(event.currentTarget.value);
              }
            }}
          />
          <button
            type="button"
            disabled={isInteractionDisabled}
            onClick={() => onSearchQueryChange(filters.searchQuery)}
          >
            {labels.searchAction}
          </button>
        </div>

        <label htmlFor="source-type-filter">{labels.sourceFilterLabel}</label>
        <select
          id="source-type-filter"
          value={filters.sourceType}
          disabled={isInteractionDisabled}
          onChange={(event) =>
            onSourceTypeFilterChange(event.target.value as "all" | "txt" | "pdf")
          }
        >
          <option value="all">{labels.allSourceTypes}</option>
          <option value="txt">{labels.sourceType("txt")}</option>
          <option value="pdf">{labels.sourceType("pdf")}</option>
        </select>

        <label htmlFor="review-status-filter">{labels.reviewStatusFilterLabel}</label>
        <select
          id="review-status-filter"
          value={filters.reviewStatus}
          disabled={isInteractionDisabled}
          onChange={(event) =>
            onReviewStatusFilterChange(event.target.value as "all" | "reviewed" | "pending")
          }
        >
          <option value="all">{labels.allReviewStatuses}</option>
          <option value="reviewed">{labels.reviewed}</option>
          <option value="pending">{labels.pendingReview}</option>
        </select>

        <label htmlFor="library-sort">{labels.sortLabel}</label>
        <select
          id="library-sort"
          value={filters.sortMode}
          disabled={isInteractionDisabled}
          onChange={(event) =>
            onSortModeChange(event.target.value as "oldest" | "newest" | "type" | "status")
          }
        >
          <option value="oldest">{labels.oldestFirst}</option>
          <option value="newest">{labels.newestFirst}</option>
          <option value="type">{labels.sortByType}</option>
          <option value="status">{labels.sortByStatus}</option>
        </select>
      </div>
      {isLoading ? <p>{labels.loading}</p> : null}
      {!isLoading && documents.length === 0 && !hasActiveFilters ? <p>{labels.empty}</p> : null}
      {!isLoading && documents.length === 0 && hasActiveFilters ? <p>{labels.noFilterResults}</p> : null}
      {documents.length > 0 ? (
        <ul>
          {documents.map((document, index) => (
            <li key={document.document_id}>
              <button
                type="button"
                className="saved-document-select"
                disabled={isInteractionDisabled}
                onClick={() => onSelectDocument(document)}
              >
                <span>
                  {labels.itemLabel(index)} | {labels.sourceType(document.source_type)}
                </span>
                <strong>{document.content.slice(0, 80)}</strong>
              </button>
              <button
                type="button"
                className="saved-document-archive"
                disabled={isInteractionDisabled}
                onClick={() => onArchiveDocument(document)}
              >
                {labels.archive}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
