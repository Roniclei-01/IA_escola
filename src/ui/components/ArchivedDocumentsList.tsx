import type { ImportTextBookResponse } from "../../infrastructure/tauri/import-text-book";

interface ArchivedDocumentsListProps {
  documents: ImportTextBookResponse[];
  isLoading: boolean;
  labels: {
    title: string;
    loading: string;
    empty: string;
    restore: string;
    itemLabel: (index: number) => string;
    sourceType: (sourceType: ImportTextBookResponse["source_type"]) => string;
  };
  onRestoreDocument: (document: ImportTextBookResponse) => void;
}

export function ArchivedDocumentsList({
  documents,
  isLoading,
  labels,
  onRestoreDocument
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
              <button type="button" onClick={() => onRestoreDocument(document)}>
                {labels.restore}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
