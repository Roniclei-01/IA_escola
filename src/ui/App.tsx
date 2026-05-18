import { useTranslation } from "react-i18next";
import { FormEvent, useEffect, useState } from "react";
import {
  importTextBook as defaultImportTextBook,
  type ImportTextBookResponse
} from "../infrastructure/tauri/import-text-book";
import {
  listImportedDocuments as defaultListImportedDocuments,
  type ListImportedDocumentsResponse
} from "../infrastructure/tauri/list-imported-documents";
import {
  listDocumentChunks as defaultListDocumentChunks,
  type ListDocumentChunksResponse
} from "../infrastructure/tauri/list-document-chunks";
import {
  chunkTextDocument as defaultChunkTextDocument,
  toChunkRequest,
  type ImportedDocumentChunk,
  type ChunkTextDocumentResponse
} from "../infrastructure/tauri/chunk-text-document";
import { MockModelAdapter } from "../domain/mock-model-adapter";
import type { StudyCard } from "../domain/model-adapter";
import { generateStudyCards } from "../app/generate-study-cards";
import {
  listStudyCards as defaultListStudyCards,
  saveStudyCards as defaultSaveStudyCards
} from "../infrastructure/tauri/study-cards";
import { ImportPanel } from "./components/ImportPanel";
import { DocumentSummary } from "./components/DocumentSummary";
import { StudyCardViewer } from "./components/StudyCardViewer";
import { SavedDocumentsList } from "./components/SavedDocumentsList";

interface AppProps {
  importTextBook?: (filePath: string) => Promise<ImportTextBookResponse>;
  listImportedDocuments?: () => Promise<ListImportedDocumentsResponse>;
  listDocumentChunks?: (documentId: string) => Promise<ListDocumentChunksResponse>;
  chunkTextDocument?: (
    request: ReturnType<typeof toChunkRequest>
  ) => Promise<ChunkTextDocumentResponse>;
  generateCards?: (chunks: ImportedDocumentChunk[]) => Promise<StudyCard[]>;
  saveStudyCards?: (cards: StudyCard[]) => Promise<StudyCard[]>;
  listStudyCards?: (documentId: string) => Promise<StudyCard[]>;
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
  listImportedDocuments = defaultListImportedDocuments,
  listDocumentChunks = defaultListDocumentChunks,
  chunkTextDocument = defaultChunkTextDocument,
  generateCards = defaultGenerateCards,
  saveStudyCards = defaultSaveStudyCards,
  listStudyCards = defaultListStudyCards
}: AppProps) {
  const { t } = useTranslation();
  const [filePath, setFilePath] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<ImportTextBookResponse | null>(null);
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<ImportTextBookResponse[]>([]);
  const [isLoadingSavedDocuments, setIsLoadingSavedDocuments] = useState(true);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);

  const activeCard = cards[activeCardIndex] ?? null;

  useEffect(() => {
    let isCurrent = true;

    async function loadSavedDocuments() {
      setIsLoadingSavedDocuments(true);

      try {
        const response = await listImportedDocuments();

        if (isCurrent) {
          setSavedDocuments(response.documents);
        }
      } catch {
        if (isCurrent) {
          setError(t("library.savedDocumentsError"));
        }
      } finally {
        if (isCurrent) {
          setIsLoadingSavedDocuments(false);
        }
      }
    }

    void loadSavedDocuments();

    return () => {
      isCurrent = false;
    };
  }, [listImportedDocuments, t]);

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
      const persistedCards =
        generatedCards.length > 0 ? await saveStudyCards(generatedCards) : [];
      setDocument(importedDocument);
      setSavedDocuments((currentDocuments) => [importedDocument, ...currentDocuments]);
      setChunkCount(chunkResponse.chunks.length);
      setCards(persistedCards);
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

  async function handleSelectSavedDocument(selectedDocument: ImportTextBookResponse) {
    setDocument(selectedDocument);
    setChunkCount(null);
    setCards([]);
    setActiveCardIndex(0);
    setIsAnswerVisible(false);
    setError(null);

    try {
      const persistedCards = await listStudyCards(selectedDocument.document_id);

      if (persistedCards.length > 0) {
        setChunkCount(new Set(persistedCards.map((card) => card.chunkId)).size);
        setCards(persistedCards);
        setActiveCardIndex(0);
        setIsAnswerVisible(false);
        return;
      }

      const chunkResponse = await listDocumentChunks(selectedDocument.document_id);
      const generatedCards =
        chunkResponse.chunks.length > 0 ? await generateCards(chunkResponse.chunks) : [];
      const savedCards = generatedCards.length > 0 ? await saveStudyCards(generatedCards) : [];

      setChunkCount(chunkResponse.chunks.length);
      setCards(savedCards);
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
    } catch (unknownError) {
      setChunkCount(null);
      setCards([]);
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
      setError(unknownError instanceof Error ? unknownError.message : t("library.unknownError"));
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

        <ImportPanel
          filePath={filePath}
          isImporting={isImporting}
          labels={{
            filePathLabel: t("library.filePathLabel"),
            filePathPlaceholder: t("library.filePathPlaceholder"),
            import: t("library.import"),
            importing: t("library.importing")
          }}
          onFilePathChange={setFilePath}
          onSubmit={handleSubmit}
        />

        {error ? (
          <p className="message error" role="alert">
            {error}
          </p>
        ) : null}

        <SavedDocumentsList
          documents={savedDocuments}
          isLoading={isLoadingSavedDocuments}
          labels={{
            title: t("library.savedDocuments"),
            loading: t("library.loadingSavedDocuments"),
            empty: t("library.noSavedDocuments"),
            itemLabel: (index) => t("library.savedDocumentItem", { number: index + 1 })
          }}
          onSelectDocument={(selectedDocument) => {
            void handleSelectSavedDocument(selectedDocument);
          }}
        />

        {document ? (
          <DocumentSummary
            document={document}
            chunkCount={chunkCount}
            cardCount={cards.length}
            labels={{
              importedDocument: t("library.importedDocument"),
              documentTitle: t("library.documentTitle"),
              chunkCount: chunkCount !== null ? t("library.chunkCount", { count: chunkCount }) : null,
              cardCount: t("library.cardCount", { count: cards.length })
            }}
          >
            {activeCard ? (
              <StudyCardViewer
                card={activeCard}
                isAnswerVisible={isAnswerVisible}
                isNextDisabled={activeCardIndex >= cards.length - 1}
                labels={{
                  title: t("study.title"),
                  progress: t("study.progress", {
                    current: activeCardIndex + 1,
                    total: cards.length
                  }),
                  revealAnswer: t("study.revealAnswer"),
                  nextCard: t("study.nextCard")
                }}
                onRevealAnswer={() => setIsAnswerVisible(true)}
                onNextCard={() => {
                  setActiveCardIndex((currentIndex) => Math.min(currentIndex + 1, cards.length - 1));
                  setIsAnswerVisible(false);
                }}
              />
            ) : null}
          </DocumentSummary>
        ) : (
          <section className="empty-state" aria-label={t("library.emptyStateLabel")}>
            <p>{t("library.emptyState")}</p>
          </section>
        )}
      </section>
    </main>
  );
}
