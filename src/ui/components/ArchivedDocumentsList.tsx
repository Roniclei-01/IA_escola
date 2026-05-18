import type { ImportTextBookResponse } from "../../infrastructure/tauri/import-text-book";

interface ArchivedDocumentsListProps {
  documents: ImportTextBookResponse[];
  isLoading: boolean;
  isInteractionDisabled?: boolean;
  labels: {
    title: string;
    loading: string;
    empty: string;
    restore: string;
    deleteForever: string;
    itemLabel: (index: number) => string;
    sourceType: (sourceType: ImportTextBookResponse["source_type"]) => string;
  };
  onRestoreDocument: (document: ImportTextBookResponse) => void;
  onDeleteDocument: (document: ImportTextBookResponse) => void;
}

export function ArchivedDocumentsList({
  documents,
  isLoading,
  isInteractionDisabled = false,
  labels,
  onRestoreDocument,
  onDeleteDocument
}: ArchivedDocumentsListProps) {
  return (
    <section className="archived-documents" aria-labelledby="archived-documents-title">
      <h2 id="archived-documents-title">{labels.title}</h2>
      {isLoading ? <p>{labels.loading}</p> : null}
      {!isLoading && documents.length === 0 ? <p>{labels.empty}</p> : null}
      {documents.length > 0 ? (
        <ul>
          {documents.map((document, index) => (
            <li key={document.document_id}>
              <div>
                <span>
                  {labels.itemLabel(index)} | {labels.sourceType(document.source_type)}
                </span>
                <strong>{document.content.slice(0, 80)}</strong>
              </div>
              <button
                type="button"
                disabled={isInteractionDisabled}
                onClick={() => onRestoreDocument(document)}
              >
                {labels.restore}
              </button>
              <button
                type="button"
                className="archived-document-delete"
                disabled={isInteractionDisabled}
                onClick={() => onDeleteDocument(document)}
              >
                {labels.deleteForever}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
