import type { ImportTextBookResponse } from "../../infrastructure/tauri/import-text-book";

interface SavedDocumentsListProps {
  documents: ImportTextBookResponse[];
  isLoading: boolean;
  labels: {
    title: string;
    loading: string;
    empty: string;
    itemLabel: (index: number) => string;
  };
  onSelectDocument: (document: ImportTextBookResponse) => void;
}

export function SavedDocumentsList({
  documents,
  isLoading,
  labels,
  onSelectDocument
}: SavedDocumentsListProps) {
  return (
    <section className="saved-documents" aria-labelledby="saved-documents-title">
      <h2 id="saved-documents-title">{labels.title}</h2>
      {isLoading ? <p>{labels.loading}</p> : null}
      {!isLoading && documents.length === 0 ? <p>{labels.empty}</p> : null}
      {documents.length > 0 ? (
        <ul>
          {documents.map((document, index) => (
            <li key={document.document_id}>
              <button type="button" onClick={() => onSelectDocument(document)}>
                <span>{labels.itemLabel(index)}</span>
                <strong>{document.content.slice(0, 80)}</strong>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
