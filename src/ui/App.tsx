import { useTranslation } from "react-i18next";
import { FormEvent, useState } from "react";
import {
  importTextBook as defaultImportTextBook,
  type ImportTextBookResponse
} from "../infrastructure/tauri/import-text-book";

interface AppProps {
  importTextBook?: (filePath: string) => Promise<ImportTextBookResponse>;
}

export function App({ importTextBook = defaultImportTextBook }: AppProps) {
  const { t } = useTranslation();
  const [filePath, setFilePath] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<ImportTextBookResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPath = filePath.trim();

    if (!trimmedPath) {
      setError(t("library.emptyPath"));
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const importedDocument = await importTextBook(trimmedPath);
      setDocument(importedDocument);
    } catch (unknownError) {
      setDocument(null);
      setError(unknownError instanceof Error ? unknownError.message : t("library.unknownError"));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace" aria-labelledby="app-title">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{t("app.stage")}</p>
            <h1 id="app-title">{t("app.title")}</h1>
          </div>
          <span className="status-pill">{t("library.status")}</span>
        </header>

        <form className="import-panel" onSubmit={handleSubmit}>
          <label htmlFor="file-path">{t("library.filePathLabel")}</label>
          <div className="import-row">
            <input
              id="file-path"
              type="text"
              value={filePath}
              onChange={(event) => setFilePath(event.target.value)}
              placeholder={t("library.filePathPlaceholder")}
            />
            <button type="submit" disabled={isImporting}>
              {isImporting ? t("library.importing") : t("library.import")}
            </button>
          </div>
        </form>

        {error ? (
          <p className="message error" role="alert">
            {error}
          </p>
        ) : null}

        {document ? (
          <section className="document-preview" aria-labelledby="document-title">
            <div>
              <p className="eyebrow">{t("library.importedDocument")}</p>
              <h2 id="document-title">{t("library.documentTitle")}</h2>
            </div>
            <p>{document.content}</p>
          </section>
        ) : (
          <section className="empty-state" aria-label={t("library.emptyStateLabel")}>
            <p>{t("library.emptyState")}</p>
          </section>
        )}
      </section>
    </main>
  );
}
