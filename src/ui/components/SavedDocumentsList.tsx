import type { ImportTextBookResponse } from "../../infrastructure/tauri/import-text-book";

interface SavedDocumentsListProps {
  documents: ImportTextBookResponse[];
  isLoading: boolean;
  filters: {
    sourceType: "all" | "txt" | "pdf";
    reviewStatus: "all" | "reviewed" | "pending";
  };
  labels: {
    title: string;
    loading: string;
    empty: string;
    noFilterResults: string;
    sourceFilterLabel: string;
    allSourceTypes: string;
    reviewStatusFilterLabel: string;
    allReviewStatuses: string;
    reviewed: string;
    pendingReview: string;
    itemLabel: (index: number) => string;
    sourceType: (sourceType: ImportTextBookResponse["source_type"]) => string;
  };
  onSourceTypeFilterChange: (sourceType: "all" | "txt" | "pdf") => void;
  onReviewStatusFilterChange: (reviewStatus: "all" | "reviewed" | "pending") => void;
  onSelectDocument: (document: ImportTextBookResponse) => void;
}

export function SavedDocumentsList({
  documents,
  isLoading,
  filters,
  labels,
  onSourceTypeFilterChange,
  onReviewStatusFilterChange,
  onSelectDocument
}: SavedDocumentsListProps) {
  const hasActiveFilters = filters.sourceType !== "all" || filters.reviewStatus !== "all";

  return (
    <section className="saved-documents" aria-labelledby="saved-documents-title">
      <h2 id="saved-documents-title">{labels.title}</h2>
      <div className="library-filters">
        <label htmlFor="source-type-filter">{labels.sourceFilterLabel}</label>
        <select
          id="source-type-filter"
          value={filters.sourceType}
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
          onChange={(event) =>
            onReviewStatusFilterChange(event.target.value as "all" | "reviewed" | "pending")
          }
        >
          <option value="all">{labels.allReviewStatuses}</option>
          <option value="reviewed">{labels.reviewed}</option>
          <option value="pending">{labels.pendingReview}</option>
        </select>
      </div>
      {isLoading ? <p>{labels.loading}</p> : null}
      {!isLoading && documents.length === 0 && !hasActiveFilters ? <p>{labels.empty}</p> : null}
      {!isLoading && documents.length === 0 && hasActiveFilters ? <p>{labels.noFilterResults}</p> : null}
      {documents.length > 0 ? (
        <ul>
          {documents.map((document, index) => (
            <li key={document.document_id}>
              <button type="button" onClick={() => onSelectDocument(document)}>
                <span>
                  {labels.itemLabel(index)} | {labels.sourceType(document.source_type)}
                </span>
                <strong>{document.content.slice(0, 80)}</strong>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
