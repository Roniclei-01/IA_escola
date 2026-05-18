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
import type { StudyCard } from "../domain/model-adapter";
import { MockModelAdapter } from "../domain/mock-model-adapter";
import { generateStudyCards } from "../app/generate-study-cards";
import { generateStudyCardsWithOllama } from "../infrastructure/tauri/generate-study-cards";
import {
  listStudyCards as defaultListStudyCards,
  saveStudyCards as defaultSaveStudyCards
} from "../infrastructure/tauri/study-cards";
import {
  listStudyReviews as defaultListStudyReviews,
  saveStudyReview as defaultSaveStudyReview,
  type StudyReview,
  type StudyReviewRating
} from "../infrastructure/tauri/study-reviews";
import { selectStudyFile as defaultSelectStudyFile } from "../infrastructure/tauri/file-dialog";
import {
  testOllamaConnection as defaultTestOllamaConnection,
  type TestOllamaConnectionResponse
} from "../infrastructure/tauri/ollama";
import {
  loadOllamaSettings as defaultLoadOllamaSettings,
  saveOllamaSettings as defaultSaveOllamaSettings,
  type OllamaSettings
} from "../infrastructure/tauri/ollama-settings";
import { ImportPanel } from "./components/ImportPanel";
import { DocumentSummary } from "./components/DocumentSummary";
import { StudyCardViewer, type CardReview } from "./components/StudyCardViewer";
import { SavedDocumentsList } from "./components/SavedDocumentsList";
import { OllamaSettingsPanel } from "./components/OllamaSettingsPanel";
import { StudyReviewHistory } from "./components/StudyReviewHistory";
import { DueStudyQueue, type DueStudyQueueItem } from "./components/DueStudyQueue";

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
  saveStudyReview?: (cardId: string, rating: StudyReviewRating) => Promise<StudyReview>;
  listStudyReviews?: (documentId: string) => Promise<StudyReview[]>;
  selectStudyFile?: () => Promise<string | null>;
  testOllamaConnection?: (request: {
    model: string;
    base_url?: string;
  }) => Promise<TestOllamaConnectionResponse>;
  loadOllamaSettings?: () => Promise<OllamaSettings>;
  saveOllamaSettings?: (settings: OllamaSettings) => Promise<OllamaSettings>;
  enableDevelopmentFallback?: boolean;
}

type OperationStatus =
  | "importingDocument"
  | "chunkingDocument"
  | "generatingCardsWithOllama"
  | "savingStudyCards"
  | "loadingSavedCards";

type SourceTypeFilter = "all" | "txt" | "pdf";
type ReviewStatusFilter = "all" | "reviewed" | "pending";

function toCardReviewMap(
  reviews: Array<{ card_id: string; rating: StudyReviewRating }>
): Record<string, CardReview> {
  return reviews.reduce<Record<string, CardReview>>((reviewMap, review) => {
    reviewMap[review.card_id] = review.rating;
    return reviewMap;
  }, {});
}

function toCardReviewScheduleMap(
  reviews: StudyReview[]
): Record<string, { priority: number; nextReviewAt: number }> {
  return reviews.reduce<Record<string, { priority: number; nextReviewAt: number }>>(
    (scheduleMap, review) => {
      scheduleMap[review.card_id] = {
        priority: review.priority,
        nextReviewAt: review.next_review_at
      };
      return scheduleMap;
    },
    {}
  );
}

function getSourceTypeLabel(
  sourceType: ImportTextBookResponse["source_type"] | undefined,
  t: ReturnType<typeof useTranslation>["t"]
): string {
  if (sourceType === "pdf") {
    return t("library.sourcePdf");
  }

  return t("library.sourceTxt");
}

function formatNextReview(timestampSeconds: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(timestampSeconds * 1000));
}

function getReviewRatingLabel(rating: StudyReviewRating, t: ReturnType<typeof useTranslation>["t"]) {
  if (rating === "again") {
    return t("study.again");
  }

  if (rating === "hard") {
    return t("study.hard");
  }

  return t("study.easy");
}

function averagePriority(reviews: StudyReview[]): number {
  if (reviews.length === 0) {
    return 0;
  }

  const totalPriority = reviews.reduce((total, review) => total + review.priority, 0);
  return Math.round(totalPriority / reviews.length);
}

function buildDueStudyQueue(
  cards: StudyCard[],
  schedules: Record<string, { priority: number; nextReviewAt: number }>,
  nowSeconds: number
): DueStudyQueueItem[] {
  return cards
    .flatMap((card) => {
      const schedule = schedules[card.id];

      if (!schedule || schedule.nextReviewAt > nowSeconds) {
        return [];
      }

      return [
        {
          card,
          priority: schedule.priority,
          nextReviewAt: schedule.nextReviewAt
        }
      ];
    })
    .sort((firstItem, secondItem) => {
      if (secondItem.priority !== firstItem.priority) {
        return secondItem.priority - firstItem.priority;
      }

      return firstItem.nextReviewAt - secondItem.nextReviewAt;
    });
}

function filterSavedDocuments(
  documents: ImportTextBookResponse[],
  sourceTypeFilter: SourceTypeFilter,
  reviewStatusFilter: ReviewStatusFilter,
  reviewCounts: Record<string, number>
): ImportTextBookResponse[] {
  return documents.filter((savedDocument) => {
    const sourceType = savedDocument.source_type ?? "txt";
    const reviewCount = reviewCounts[savedDocument.document_id] ?? 0;

    if (sourceTypeFilter !== "all" && sourceType !== sourceTypeFilter) {
      return false;
    }

    if (reviewStatusFilter === "reviewed") {
      return reviewCount > 0;
    }

    if (reviewStatusFilter === "pending") {
      return reviewCount === 0;
    }

    return true;
  });
}

export function App({
  importTextBook = defaultImportTextBook,
  listImportedDocuments = defaultListImportedDocuments,
  listDocumentChunks = defaultListDocumentChunks,
  chunkTextDocument = defaultChunkTextDocument,
  generateCards = generateStudyCardsWithOllama,
  saveStudyCards = defaultSaveStudyCards,
  listStudyCards = defaultListStudyCards,
  saveStudyReview = defaultSaveStudyReview,
  listStudyReviews = defaultListStudyReviews,
  selectStudyFile = defaultSelectStudyFile,
  testOllamaConnection = defaultTestOllamaConnection,
  loadOllamaSettings = defaultLoadOllamaSettings,
  saveOllamaSettings = defaultSaveOllamaSettings,
  enableDevelopmentFallback = import.meta.env.DEV
}: AppProps) {
  const { t } = useTranslation();
  const [filePath, setFilePath] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [operationStatus, setOperationStatus] = useState<OperationStatus | null>(null);
  const [document, setDocument] = useState<ImportTextBookResponse | null>(null);
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<ImportTextBookResponse[]>([]);
  const [documentReviewCounts, setDocumentReviewCounts] = useState<Record<string, number>>({});
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceTypeFilter>("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatusFilter>("all");
  const [isLoadingSavedDocuments, setIsLoadingSavedDocuments] = useState(true);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [cardReviews, setCardReviews] = useState<Record<string, CardReview>>({});
  const [reviewHistory, setReviewHistory] = useState<StudyReview[]>([]);
  const [cardReviewSchedules, setCardReviewSchedules] = useState<
    Record<string, { priority: number; nextReviewAt: number }>
  >({});
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://127.0.0.1:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const [isTestingOllama, setIsTestingOllama] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<string | null>(null);

  const activeCard = cards[activeCardIndex] ?? null;
  const filteredSavedDocuments = filterSavedDocuments(
    savedDocuments,
    sourceTypeFilter,
    reviewStatusFilter,
    documentReviewCounts
  );
  const activeReviewSchedule = activeCard ? cardReviewSchedules[activeCard.id] ?? null : null;
  const dueStudyQueue = buildDueStudyQueue(
    cards,
    cardReviewSchedules,
    Math.floor(Date.now() / 1000)
  );
  const reviewCounts = Object.values(cardReviews).reduce(
    (counts, review) => ({
      ...counts,
      [review]: counts[review] + 1
    }),
    { again: 0, hard: 0, easy: 0 } satisfies Record<CardReview, number>
  );

  async function generateCardsWithFallback(chunks: ImportedDocumentChunk[]): Promise<StudyCard[]> {
    try {
      return await generateCards(chunks);
    } catch (unknownError) {
      if (!enableDevelopmentFallback) {
        throw unknownError;
      }

      const fallbackCards = await generateStudyCards(
        chunks,
        { cardsPerChunk: 1, language: "pt" },
        new MockModelAdapter()
      );

      setWarning(t("library.mockGenerationFallback"));
      return fallbackCards;
    }
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadSavedDocuments() {
      setIsLoadingSavedDocuments(true);

      try {
        const response = await listImportedDocuments();
        const reviewCountEntries = await Promise.all(
          response.documents.map(async (savedDocument) => {
            try {
              const reviews = await listStudyReviews(savedDocument.document_id);
              return [savedDocument.document_id, reviews.length] as const;
            } catch {
              return [savedDocument.document_id, 0] as const;
            }
          })
        );

        if (isCurrent) {
          setSavedDocuments(response.documents);
          setDocumentReviewCounts(Object.fromEntries(reviewCountEntries));
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
  }, [listImportedDocuments, listStudyReviews, t]);

  useEffect(() => {
    let isCurrent = true;

    async function loadSettings() {
      try {
        const settings = await loadOllamaSettings();

        if (isCurrent) {
          setOllamaBaseUrl(settings.base_url);
          setOllamaModel(settings.model);
        }
      } catch {
        if (isCurrent) {
          setError(t("settings.ollamaSettingsLoadError"));
        }
      }
    }

    void loadSettings();

    return () => {
      isCurrent = false;
    };
  }, [loadOllamaSettings, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPath = filePath.trim();

    if (!trimmedPath) {
      setError(t("library.emptyPath"));
      return;
    }

    setIsImporting(true);
    setError(null);
    setWarning(null);
    setOperationStatus("importingDocument");
    setChunkCount(null);
    setCards([]);
    setActiveCardIndex(0);
    setIsAnswerVisible(false);
    setCardReviews({});
    setReviewHistory([]);
    setCardReviewSchedules({});

    try {
      const importedDocument = await importTextBook(trimmedPath);
      setOperationStatus("chunkingDocument");
      const chunkResponse = await chunkTextDocument(toChunkRequest(importedDocument, 180));
      setOperationStatus("generatingCardsWithOllama");
      const generatedCards = await generateCardsWithFallback(chunkResponse.chunks);
      setOperationStatus("savingStudyCards");
      const persistedCards =
        generatedCards.length > 0 ? await saveStudyCards(generatedCards) : [];
      setDocument(importedDocument);
      setSavedDocuments((currentDocuments) => [importedDocument, ...currentDocuments]);
      setDocumentReviewCounts((currentCounts) => ({
        ...currentCounts,
        [importedDocument.document_id]: 0
      }));
      setChunkCount(chunkResponse.chunks.length);
      setCards(persistedCards);
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
      setCardReviews({});
      setReviewHistory([]);
      setCardReviewSchedules({});
    } catch (unknownError) {
      setDocument(null);
      setChunkCount(null);
      setCards([]);
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
      setCardReviews({});
      setReviewHistory([]);
      setCardReviewSchedules({});
      setError(unknownError instanceof Error ? unknownError.message : t("library.unknownError"));
    } finally {
      setIsImporting(false);
      setOperationStatus(null);
    }
  }

  async function handleSelectSavedDocument(selectedDocument: ImportTextBookResponse) {
    setDocument(selectedDocument);
    setChunkCount(null);
    setCards([]);
    setActiveCardIndex(0);
    setIsAnswerVisible(false);
    setCardReviews({});
    setReviewHistory([]);
    setCardReviewSchedules({});
    setError(null);
    setWarning(null);
    setOperationStatus("loadingSavedCards");

    try {
      const persistedCards = await listStudyCards(selectedDocument.document_id);

      if (persistedCards.length > 0) {
        const persistedReviews = await listStudyReviews(selectedDocument.document_id);
        setChunkCount(new Set(persistedCards.map((card) => card.chunkId)).size);
        setCards(persistedCards);
        setActiveCardIndex(0);
        setIsAnswerVisible(false);
        setCardReviews(toCardReviewMap(persistedReviews));
        setReviewHistory(persistedReviews);
        setDocumentReviewCounts((currentCounts) => ({
          ...currentCounts,
          [selectedDocument.document_id]: persistedReviews.length
        }));
        setCardReviewSchedules(toCardReviewScheduleMap(persistedReviews));
        setOperationStatus(null);
        return;
      }

      setOperationStatus("chunkingDocument");
      const chunkResponse = await listDocumentChunks(selectedDocument.document_id);
      setOperationStatus("generatingCardsWithOllama");
      const generatedCards =
        chunkResponse.chunks.length > 0 ? await generateCardsWithFallback(chunkResponse.chunks) : [];
      setOperationStatus("savingStudyCards");
      const savedCards = generatedCards.length > 0 ? await saveStudyCards(generatedCards) : [];

      setChunkCount(chunkResponse.chunks.length);
      setCards(savedCards);
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
      setCardReviews({});
      setReviewHistory([]);
      setCardReviewSchedules({});
      setOperationStatus(null);
    } catch (unknownError) {
      setChunkCount(null);
      setCards([]);
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
      setCardReviews({});
      setReviewHistory([]);
      setCardReviewSchedules({});
      setOperationStatus(null);
      setError(unknownError instanceof Error ? unknownError.message : t("library.unknownError"));
    }
  }

  async function handleTestOllama(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsTestingOllama(true);
    setOllamaStatus(null);
    setError(null);
    setWarning(null);

    try {
      const response = await testOllamaConnection({
        model: ollamaModel.trim(),
        base_url: ollamaBaseUrl.trim()
      });
      const savedSettings = await saveOllamaSettings({
        model: response.model,
        base_url: ollamaBaseUrl.trim()
      });

      setOllamaBaseUrl(savedSettings.base_url);
      setOllamaModel(savedSettings.model);
      setOllamaStatus(t("settings.ollamaConnectionOk", { model: savedSettings.model }));
    } catch (unknownError) {
      setOllamaStatus(null);
      setError(unknownError instanceof Error ? unknownError.message : t("settings.ollamaConnectionError"));
    } finally {
      setIsTestingOllama(false);
    }
  }

  async function handleChooseFile() {
    setError(null);
    setWarning(null);

    try {
      const selectedPath = await selectStudyFile();

      if (selectedPath) {
        setFilePath(selectedPath);
      }
    } catch {
      setError(t("library.fileDialogError"));
    }
  }

  async function handleReviewCard(review: CardReview) {
    if (!activeCard) {
      return;
    }

    const reviewedCard = activeCard;

    setCardReviews((currentReviews) => ({
      ...currentReviews,
      [reviewedCard.id]: review
    }));

    if (activeCardIndex < cards.length - 1) {
      setActiveCardIndex((currentIndex) => currentIndex + 1);
      setIsAnswerVisible(false);
    }

    try {
      const savedReview = await saveStudyReview(reviewedCard.id, review);
      setReviewHistory((currentReviews) => [...currentReviews, savedReview]);
      if (document) {
        setDocumentReviewCounts((currentCounts) => ({
          ...currentCounts,
          [document.document_id]: (currentCounts[document.document_id] ?? 0) + 1
        }));
      }
      setCardReviewSchedules((currentSchedules) => ({
        ...currentSchedules,
        [reviewedCard.id]: {
          priority: savedReview.priority,
          nextReviewAt: savedReview.next_review_at
        }
      }));
    } catch {
      setError(t("study.reviewSaveError"));
    }
  }

  function handleSelectDueCard(cardId: string) {
    const cardIndex = cards.findIndex((card) => card.id === cardId);

    if (cardIndex >= 0) {
      setActiveCardIndex(cardIndex);
      setIsAnswerVisible(false);
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
            chooseFile: t("library.chooseFile"),
            import: t("library.import"),
            importing: t("library.importing")
          }}
          onFilePathChange={setFilePath}
          onChooseFile={() => {
            void handleChooseFile();
          }}
          onSubmit={handleSubmit}
        />

        {error ? (
          <p className="message error" role="alert">
            {error}
          </p>
        ) : null}

        {warning ? (
          <p className="message warning" role="alert">
            {warning}
          </p>
        ) : null}

        {operationStatus ? (
          <p className="message info" role="status">
            {t(`library.${operationStatus}`)}
          </p>
        ) : null}

        <OllamaSettingsPanel
          baseUrl={ollamaBaseUrl}
          model={ollamaModel}
          isTesting={isTestingOllama}
          status={ollamaStatus}
          labels={{
            title: t("settings.ollamaTitle"),
            baseUrlLabel: t("settings.ollamaBaseUrlLabel"),
            modelLabel: t("settings.ollamaModelLabel"),
            test: t("settings.testOllama"),
            testing: t("settings.testingOllama")
          }}
          onBaseUrlChange={setOllamaBaseUrl}
          onModelChange={setOllamaModel}
          onSubmit={handleTestOllama}
        />

        <SavedDocumentsList
          documents={filteredSavedDocuments}
          isLoading={isLoadingSavedDocuments}
          filters={{
            sourceType: sourceTypeFilter,
            reviewStatus: reviewStatusFilter
          }}
          labels={{
            title: t("library.savedDocuments"),
            loading: t("library.loadingSavedDocuments"),
            empty: t("library.noSavedDocuments"),
            noFilterResults: t("library.noFilteredDocuments"),
            sourceFilterLabel: t("library.sourceFilterLabel"),
            allSourceTypes: t("library.allSourceTypes"),
            reviewStatusFilterLabel: t("library.reviewStatusFilterLabel"),
            allReviewStatuses: t("library.allReviewStatuses"),
            reviewed: t("library.reviewed"),
            pendingReview: t("library.pendingReview"),
            itemLabel: (index) => t("library.savedDocumentItem", { number: index + 1 }),
            sourceType: (sourceType) => getSourceTypeLabel(sourceType, t)
          }}
          onSourceTypeFilterChange={setSourceTypeFilter}
          onReviewStatusFilterChange={setReviewStatusFilter}
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
              sourceType: t("library.sourceType", {
                type: getSourceTypeLabel(document.source_type, t)
              }),
              sourcePath: t("library.sourcePath", {
                path: document.source_path
              }),
              chunkCount: chunkCount !== null ? t("library.chunkCount", { count: chunkCount }) : null,
              cardCount: t("library.cardCount", { count: cards.length })
            }}
          >
            {activeCard ? (
              <StudyCardViewer
                card={activeCard}
                isAnswerVisible={isAnswerVisible}
                isNextDisabled={activeCardIndex >= cards.length - 1}
                selectedReview={cardReviews[activeCard.id] ?? null}
                reviewSchedule={
                  activeReviewSchedule
                    ? t("study.reviewSchedule", {
                        priority: activeReviewSchedule.priority,
                        nextReviewAt: formatNextReview(activeReviewSchedule.nextReviewAt)
                      })
                    : null
                }
                labels={{
                  title: t("study.title"),
                  progress: t("study.progress", {
                    current: activeCardIndex + 1,
                    total: cards.length
                  }),
                  reviewSummary: t("study.reviewSummary", {
                    easy: reviewCounts.easy,
                    again: reviewCounts.again,
                    hard: reviewCounts.hard
                  }),
                  revealAnswer: t("study.revealAnswer"),
                  nextCard: t("study.nextCard"),
                  again: t("study.again"),
                  hard: t("study.hard"),
                  easy: t("study.easy")
                }}
                onRevealAnswer={() => setIsAnswerVisible(true)}
                onNextCard={() => {
                  setActiveCardIndex((currentIndex) => Math.min(currentIndex + 1, cards.length - 1));
                  setIsAnswerVisible(false);
                }}
                onReviewCard={(review) => {
                  void handleReviewCard(review);
                }}
              />
            ) : null}
            <DueStudyQueue
              items={dueStudyQueue}
              labels={{
                title: t("study.dueQueueTitle"),
                summary: t("study.dueQueueSummary", { count: dueStudyQueue.length }),
                empty: t("study.dueQueueEmpty"),
                item: (item) =>
                  t("study.dueQueueItem", {
                    priority: item.priority,
                    nextReviewAt: formatNextReview(item.nextReviewAt)
                  })
              }}
              onSelectCard={handleSelectDueCard}
            />
            <StudyReviewHistory
              reviews={reviewHistory}
              labels={{
                title: t("study.reviewHistoryTitle"),
                summary: t("study.reviewHistorySummary", {
                  count: reviewHistory.length,
                  averagePriority: averagePriority(reviewHistory)
                }),
                empty: t("study.reviewHistoryEmpty"),
                ratingLabel: (rating) => getReviewRatingLabel(rating, t),
                reviewItem: (review) =>
                  t("study.reviewHistoryItem", {
                    priority: review.priority,
                    nextReviewAt: formatNextReview(review.next_review_at)
                  })
              }}
            />
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
