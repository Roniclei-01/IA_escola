import { useTranslation } from "react-i18next";
import { FormEvent, useState } from "react";
import {
  importTextBook as defaultImportTextBook,
  type ImportTextBookResponse
} from "../infrastructure/tauri/import-text-book";
import {
  chunkTextDocument as defaultChunkTextDocument,
  toChunkRequest,
  type ChunkTextDocumentResponse
} from "../infrastructure/tauri/chunk-text-document";

interface AppProps {
  importTextBook?: (filePath: string) => Promise<ImportTextBookResponse>;
  chunkTextDocument?: (
    request: ReturnType<typeof toChunkRequest>
  ) => Promise<ChunkTextDocumentResponse>;
}

export function App({
  importTextBook = defaultImportTextBook,
  chunkTextDocument = defaultChunkTextDocument
}: AppProps) {
  const { t } = useTranslation();
  const [filePath, setFilePath] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<ImportTextBookResponse | null>(null);
  const [chunkCount, setChunkCount] = useState<number | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPath = filePath.trim();

    if (!trimmedPath) {
      setError(t("library.emptyPath"));
      return;
    }

    setIsImporting(true);
    setError(null);
    setChunkCount(null);

    try {
      const importedDocument = await importTextBook(trimmedPath);
      const chunkResponse = await chunkTextDocument(toChunkRequest(importedDocument, 180));
      setDocument(importedDocument);
      setChunkCount(chunkResponse.chunks.length);
    } catch (unknownError) {
      setDocument(null);
      setChunkCount(null);
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
            {chunkCount !== null ? (
              <p className="chunk-count">
                {t("library.chunkCount", { count: chunkCount })}
              </p>
            ) : null}
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
