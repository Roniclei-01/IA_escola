import { useTranslation } from "react-i18next";
import { FormEvent, useState } from "react";
import {
  importTextBook as defaultImportTextBook,
  type ImportTextBookResponse
} from "../infrastructure/tauri/import-text-book";
import {
  chunkTextDocument as defaultChunkTextDocument,
  toChunkRequest,
  type ImportedDocumentChunk,
  type ChunkTextDocumentResponse
} from "../infrastructure/tauri/chunk-text-document";
import { MockModelAdapter } from "../domain/mock-model-adapter";
import type { StudyCard } from "../domain/model-adapter";
import { generateStudyCards } from "../app/generate-study-cards";

interface AppProps {
  importTextBook?: (filePath: string) => Promise<ImportTextBookResponse>;
  chunkTextDocument?: (
    request: ReturnType<typeof toChunkRequest>
  ) => Promise<ChunkTextDocumentResponse>;
  generateCards?: (chunks: ImportedDocumentChunk[]) => Promise<StudyCard[]>;
}

const mockModelAdapter = new MockModelAdapter();

async function defaultGenerateCards(chunks: ImportedDocumentChunk[]) {
  return generateStudyCards(
    chunks,
    {
      cardsPerChunk: 1,
      language: "pt"
    },
    mockModelAdapter
  );
}

export function App({
  importTextBook = defaultImportTextBook,
  chunkTextDocument = defaultChunkTextDocument,
  generateCards = defaultGenerateCards
}: AppProps) {
  const { t } = useTranslation();
  const [filePath, setFilePath] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<ImportTextBookResponse | null>(null);
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);

  const activeCard = cards[activeCardIndex] ?? null;

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
    setCards([]);
    setActiveCardIndex(0);
    setIsAnswerVisible(false);

    try {
      const importedDocument = await importTextBook(trimmedPath);
      const chunkResponse = await chunkTextDocument(toChunkRequest(importedDocument, 180));
      const generatedCards = await generateCards(chunkResponse.chunks);
      setDocument(importedDocument);
      setChunkCount(chunkResponse.chunks.length);
      setCards(generatedCards);
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
    } catch (unknownError) {
      setDocument(null);
      setChunkCount(null);
      setCards([]);
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
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
            <p className="card-count">{t("library.cardCount", { count: cards.length })}</p>
            <p>{document.content}</p>
            {activeCard ? (
              <article className="card-preview" aria-labelledby="card-preview-title">
                <div className="study-header">
                  <h3 id="card-preview-title">{t("study.title")}</h3>
                  <span>{t("study.progress", { current: activeCardIndex + 1, total: cards.length })}</span>
                </div>
                <p className="card-front">{activeCard.front}</p>
                {isAnswerVisible ? <p className="card-back">{activeCard.back}</p> : null}
                <div className="study-actions">
                  <button type="button" onClick={() => setIsAnswerVisible(true)}>
                    {t("study.revealAnswer")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCardIndex((currentIndex) =>
                        Math.min(currentIndex + 1, cards.length - 1)
                      );
                      setIsAnswerVisible(false);
                    }}
                    disabled={activeCardIndex >= cards.length - 1}
                  >
                    {t("study.nextCard")}
                  </button>
                </div>
              </article>
            ) : null}
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
