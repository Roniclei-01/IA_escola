import { useTranslation } from "react-i18next";
import { FormEvent, useEffect, useState } from "react";
import {
  importTextBook as defaultImportTextBook,
  type ImportTextBookResponse
} from "../infrastructure/tauri/import-text-book";
import { archiveImportedDocument as defaultArchiveImportedDocument } from "../infrastructure/tauri/archive-imported-document";
import {
  listArchivedDocuments as defaultListArchivedDocuments,
  restoreImportedDocument as defaultRestoreImportedDocument,
  type ListArchivedDocumentsResponse
} from "../infrastructure/tauri/archived-documents";
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
import {
  listStudySessionSummaries as defaultListStudySessionSummaries,
  startStudySession as defaultStartStudySession,
  type StudySession,
  type StudySessionSummary
} from "../infrastructure/tauri/study-sessions";
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
import { StudySessionHistory } from "./components/StudySessionHistory";
import { ArchivedDocumentsList } from "./components/ArchivedDocumentsList";

interface AppProps {
  importTextBook?: (filePath: string) => Promise<ImportTextBookResponse>;
  archiveImportedDocument?: (documentId: string) => Promise<{ document_id: string }>;
  listArchivedDocuments?: () => Promise<ListArchivedDocumentsResponse>;
  restoreImportedDocument?: (documentId: string) => Promise<{ document_id: string }>;
  listImportedDocuments?: () => Promise<ListImportedDocumentsResponse>;
  listDocumentChunks?: (documentId: string) => Promise<ListDocumentChunksResponse>;
  chunkTextDocument?: (
    request: ReturnType<typeof toChunkRequest>
  ) => Promise<ChunkTextDocumentResponse>;
  generateCards?: (chunks: ImportedDocumentChunk[]) => Promise<StudyCard[]>;
  saveStudyCards?: (cards: StudyCard[]) => Promise<StudyCard[]>;
  listStudyCards?: (documentId: string) => Promise<StudyCard[]>;
  saveStudyReview?: (
    cardId: string,
    rating: StudyReviewRating,
    sessionId?: string | null
  ) => Promise<StudyReview>;
  listStudyReviews?: (documentId: string) => Promise<StudyReview[]>;
  startStudySession?: (documentId: string) => Promise<StudySession>;
  listStudySessionSummaries?: (documentId: string) => Promise<StudySessionSummary[]>;
  selectStudyFile?: () => Promise<string | null>;
  testOllamaConnection?: (request: {
    model: string;
    base_url?: string;
  }) => Promise<TestOllamaConnectionResponse>;
  loadOllamaSettings?: () => Promise<OllamaSettings>;
  saveOllamaSettings?: (settings: OllamaSettings) => Promise<OllamaSettings>;
  downloadTextFile?: (fileName: string, content: string) => void;
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
type LibrarySortMode = "oldest" | "newest" | "type" | "status";

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

function defaultDownloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function sanitizeReportFileName(value: string): string {
  const normalizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedValue || "documento";
}

function buildStudySessionReport(
  document: ImportTextBookResponse,
  summaries: StudySessionSummary[]
): string {
  const documentTitle = document.content.split("\n")[0]?.trim() || "Documento";
  const totalAgain = summaries.reduce((total, summary) => total + summary.again_count, 0);
  const totalHard = summaries.reduce((total, summary) => total + summary.hard_count, 0);
  const totalEasy = summaries.reduce((total, summary) => total + summary.easy_count, 0);
  const totalReviews = totalAgain + totalHard + totalEasy;
  const sessionLines = summaries.map((summary, index) => {
    const startedAt = formatNextReview(summary.started_at);

    return [
      `## Sessao ${index + 1}`,
      "",
      `- Inicio: ${startedAt}`,
      `- Acertos: ${summary.easy_count}`,
      `- Dificeis: ${summary.hard_count}`,
      `- Erros: ${summary.again_count}`
    ].join("\n");
  });

  return [
    `# Relatorio de estudo - ${documentTitle}`,
    "",
    `- Documento: ${documentTitle}`,
    `- Origem: ${document.source_path ?? "Nao informada"}`,
    `- Tipo: ${document.source_type ?? "txt"}`,
    `- Sessoes: ${summaries.length}`,
    `- Revisoes: ${totalReviews}`,
    `- Acertos: ${totalEasy}`,
    `- Dificeis: ${totalHard}`,
    `- Erros: ${totalAgain}`,
    "",
    ...sessionLines
  ].join("\n");
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
  searchQuery: string,
  sortMode: LibrarySortMode,
  reviewCounts: Record<string, number>
): ImportTextBookResponse[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return documents
    .map((savedDocument, originalIndex) => ({ savedDocument, originalIndex }))
    .filter(({ savedDocument }) => {
      const sourceType = savedDocument.source_type ?? "txt";
      const reviewCount = reviewCounts[savedDocument.document_id] ?? 0;
      const searchableText =
        `${savedDocument.content} ${savedDocument.source_path ?? ""}`.toLowerCase();

      if (sourceTypeFilter !== "all" && sourceType !== sourceTypeFilter) {
        return false;
      }

      if (normalizedQuery && !searchableText.includes(normalizedQuery)) {
        return false;
      }

      if (reviewStatusFilter === "reviewed") {
        return reviewCount > 0;
      }

      if (reviewStatusFilter === "pending") {
        return reviewCount === 0;
      }

      return true;
    })
    .sort((firstItem, secondItem) => {
      if (sortMode === "newest") {
        return secondItem.originalIndex - firstItem.originalIndex;
      }

      if (sortMode === "type") {
        return (firstItem.savedDocument.source_type ?? "txt").localeCompare(
          secondItem.savedDocument.source_type ?? "txt"
        );
      }

      if (sortMode === "status") {
        const firstReviewCount = reviewCounts[firstItem.savedDocument.document_id] ?? 0;
        const secondReviewCount = reviewCounts[secondItem.savedDocument.document_id] ?? 0;
        return Number(secondReviewCount > 0) - Number(firstReviewCount > 0);
      }

      return firstItem.originalIndex - secondItem.originalIndex;
    })
    .map(({ savedDocument }) => savedDocument);
}

export function App({
  importTextBook = defaultImportTextBook,
  archiveImportedDocument = defaultArchiveImportedDocument,
  listArchivedDocuments = defaultListArchivedDocuments,
  restoreImportedDocument = defaultRestoreImportedDocument,
  listImportedDocuments = defaultListImportedDocuments,
  listDocumentChunks = defaultListDocumentChunks,
  chunkTextDocument = defaultChunkTextDocument,
  generateCards = generateStudyCardsWithOllama,
  saveStudyCards = defaultSaveStudyCards,
  listStudyCards = defaultListStudyCards,
  saveStudyReview = defaultSaveStudyReview,
  listStudyReviews = defaultListStudyReviews,
  startStudySession = defaultStartStudySession,
  listStudySessionSummaries = defaultListStudySessionSummaries,
  selectStudyFile = defaultSelectStudyFile,
  testOllamaConnection = defaultTestOllamaConnection,
  loadOllamaSettings = defaultLoadOllamaSettings,
  saveOllamaSettings = defaultSaveOllamaSettings,
  downloadTextFile = defaultDownloadTextFile,
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
  const [archivedDocuments, setArchivedDocuments] = useState<ImportTextBookResponse[]>([]);
  const [documentReviewCounts, setDocumentReviewCounts] = useState<Record<string, number>>({});
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceTypeFilter>("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatusFilter>("all");
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [librarySortMode, setLibrarySortMode] = useState<LibrarySortMode>("oldest");
  const [isLoadingSavedDocuments, setIsLoadingSavedDocuments] = useState(true);
  const [isLoadingArchivedDocuments, setIsLoadingArchivedDocuments] = useState(true);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [cardReviews, setCardReviews] = useState<Record<string, CardReview>>({});
  const [reviewHistory, setReviewHistory] = useState<StudyReview[]>([]);
  const [activeStudySession, setActiveStudySession] = useState<StudySession | null>(null);
  const [studySessionReviewCount, setStudySessionReviewCount] = useState(0);
  const [studySessionSummaries, setStudySessionSummaries] = useState<StudySessionSummary[]>([]);
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
    librarySearchQuery,
    librarySortMode,
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

  async function beginStudySession(documentId: string) {
    const session = await startStudySession(documentId);

    setActiveStudySession(session);
    setStudySessionReviewCount(0);
    setStudySessionSummaries((currentSummaries) => [
      ...currentSummaries,
      {
        session_id: session.id,
        document_id: session.document_id,
        started_at: session.started_at,
        again_count: 0,
        hard_count: 0,
        easy_count: 0
      }
    ]);
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

    async function loadArchivedDocuments() {
      setIsLoadingArchivedDocuments(true);

      try {
        const response = await listArchivedDocuments();

        if (isCurrent) {
          setArchivedDocuments(response.documents);
        }
      } catch {
        if (isCurrent) {
          setError(t("library.archivedDocumentsError"));
        }
      } finally {
        if (isCurrent) {
          setIsLoadingArchivedDocuments(false);
        }
      }
    }

    void loadArchivedDocuments();

    return () => {
      isCurrent = false;
    };
  }, [listArchivedDocuments, t]);

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
    setActiveStudySession(null);
    setStudySessionReviewCount(0);
    setStudySessionSummaries([]);
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
      setSavedDocuments((currentDocuments) => [...currentDocuments, importedDocument]);
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
      setStudySessionSummaries([]);
      await beginStudySession(importedDocument.document_id);
      setCardReviewSchedules({});
    } catch (unknownError) {
      setDocument(null);
      setChunkCount(null);
      setCards([]);
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
      setCardReviews({});
      setReviewHistory([]);
      setActiveStudySession(null);
      setStudySessionReviewCount(0);
      setStudySessionSummaries([]);
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
    setActiveStudySession(null);
    setStudySessionReviewCount(0);
    setStudySessionSummaries([]);
    setCardReviewSchedules({});
    setError(null);
    setWarning(null);
    setOperationStatus("loadingSavedCards");

    try {
      const persistedCards = await listStudyCards(selectedDocument.document_id);

      if (persistedCards.length > 0) {
        const persistedReviews = await listStudyReviews(selectedDocument.document_id);
        const persistedSessionSummaries = await listStudySessionSummaries(
          selectedDocument.document_id
        );
        setChunkCount(new Set(persistedCards.map((card) => card.chunkId)).size);
        setCards(persistedCards);
        setActiveCardIndex(0);
        setIsAnswerVisible(false);
        setCardReviews(toCardReviewMap(persistedReviews));
        setReviewHistory(persistedReviews);
        setStudySessionSummaries(persistedSessionSummaries);
        await beginStudySession(selectedDocument.document_id);
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
      setStudySessionSummaries([]);
      await beginStudySession(selectedDocument.document_id);
      setCardReviewSchedules({});
      setOperationStatus(null);
    } catch (unknownError) {
      setChunkCount(null);
      setCards([]);
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
      setCardReviews({});
      setReviewHistory([]);
      setActiveStudySession(null);
      setStudySessionReviewCount(0);
      setStudySessionSummaries([]);
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

  async function handleArchiveDocument(documentToArchive: ImportTextBookResponse) {
    setError(null);
    setWarning(null);

    try {
      await archiveImportedDocument(documentToArchive.document_id);
      setSavedDocuments((currentDocuments) =>
        currentDocuments.filter(
          (savedDocument) => savedDocument.document_id !== documentToArchive.document_id
        )
      );
      setArchivedDocuments((currentDocuments) => [documentToArchive, ...currentDocuments]);
      setDocumentReviewCounts((currentCounts) => {
        const nextCounts = { ...currentCounts };
        delete nextCounts[documentToArchive.document_id];
        return nextCounts;
      });

      if (document?.document_id === documentToArchive.document_id) {
        setDocument(null);
        setChunkCount(null);
        setCards([]);
        setActiveCardIndex(0);
        setIsAnswerVisible(false);
        setCardReviews({});
        setReviewHistory([]);
        setActiveStudySession(null);
        setStudySessionReviewCount(0);
        setStudySessionSummaries([]);
        setCardReviewSchedules({});
      }
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : t("library.archiveError"));
    }
  }

  async function handleRestoreDocument(documentToRestore: ImportTextBookResponse) {
    setError(null);
    setWarning(null);

    try {
      await restoreImportedDocument(documentToRestore.document_id);
      setArchivedDocuments((currentDocuments) =>
        currentDocuments.filter(
          (archivedDocument) => archivedDocument.document_id !== documentToRestore.document_id
        )
      );
      setSavedDocuments((currentDocuments) => [...currentDocuments, documentToRestore]);

      try {
        const reviews = await listStudyReviews(documentToRestore.document_id);
        setDocumentReviewCounts((currentCounts) => ({
          ...currentCounts,
          [documentToRestore.document_id]: reviews.length
        }));
      } catch {
        setDocumentReviewCounts((currentCounts) => ({
          ...currentCounts,
          [documentToRestore.document_id]: 0
        }));
      }
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : t("library.restoreError"));
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
      const savedReview = await saveStudyReview(reviewedCard.id, review, activeStudySession?.id ?? null);
      setReviewHistory((currentReviews) => [...currentReviews, savedReview]);
      setStudySessionReviewCount((currentCount) => currentCount + 1);
      if (activeStudySession) {
        setStudySessionSummaries((currentSummaries) =>
          currentSummaries.map((summary) => {
            if (summary.session_id !== activeStudySession.id) {
              return summary;
            }

            return {
              ...summary,
              again_count: summary.again_count + (review === "again" ? 1 : 0),
              hard_count: summary.hard_count + (review === "hard" ? 1 : 0),
              easy_count: summary.easy_count + (review === "easy" ? 1 : 0)
            };
          })
        );
      }
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

  function handleExportStudySessionReport() {
    if (!document || studySessionSummaries.length === 0) {
      return;
    }

    const fileName = `relatorio-estudo-${sanitizeReportFileName(document.document_id)}.md`;
    downloadTextFile(fileName, buildStudySessionReport(document, studySessionSummaries));
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
            reviewStatus: reviewStatusFilter,
            searchQuery: librarySearchQuery,
            sortMode: librarySortMode
          }}
          labels={{
            title: t("library.savedDocuments"),
            loading: t("library.loadingSavedDocuments"),
            empty: t("library.noSavedDocuments"),
            noFilterResults: t("library.noFilteredDocuments"),
            searchLabel: t("library.searchLabel"),
            searchPlaceholder: t("library.searchPlaceholder"),
            sourceFilterLabel: t("library.sourceFilterLabel"),
            allSourceTypes: t("library.allSourceTypes"),
            reviewStatusFilterLabel: t("library.reviewStatusFilterLabel"),
            allReviewStatuses: t("library.allReviewStatuses"),
            reviewed: t("library.reviewed"),
            pendingReview: t("library.pendingReview"),
            sortLabel: t("library.sortLabel"),
            oldestFirst: t("library.oldestFirst"),
            newestFirst: t("library.newestFirst"),
            sortByType: t("library.sortByType"),
            sortByStatus: t("library.sortByStatus"),
            archive: t("library.archiveDocument"),
            itemLabel: (index) => t("library.savedDocumentItem", { number: index + 1 }),
            sourceType: (sourceType) => getSourceTypeLabel(sourceType, t)
          }}
          onSearchQueryChange={setLibrarySearchQuery}
          onSourceTypeFilterChange={setSourceTypeFilter}
          onReviewStatusFilterChange={setReviewStatusFilter}
          onSortModeChange={setLibrarySortMode}
          onSelectDocument={(selectedDocument) => {
            void handleSelectSavedDocument(selectedDocument);
          }}
          onArchiveDocument={(selectedDocument) => {
            void handleArchiveDocument(selectedDocument);
          }}
        />

        <ArchivedDocumentsList
          documents={archivedDocuments}
          isLoading={isLoadingArchivedDocuments}
          labels={{
            title: t("library.archivedDocuments"),
            loading: t("library.loadingArchivedDocuments"),
            empty: t("library.noArchivedDocuments"),
            restore: t("library.restoreDocument"),
            itemLabel: (index) => t("library.archivedDocumentItem", { number: index + 1 }),
            sourceType: (sourceType) => getSourceTypeLabel(sourceType, t)
          }}
          onRestoreDocument={(selectedDocument) => {
            void handleRestoreDocument(selectedDocument);
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
            {activeStudySession ? (
              <p className="session-summary">
                {t("study.sessionSummary", { count: studySessionReviewCount })}
              </p>
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
            <StudySessionHistory
              summaries={studySessionSummaries}
              labels={{
                title: t("study.sessionHistoryTitle"),
                empty: t("study.sessionHistoryEmpty"),
                exportReport: t("study.exportSessionReport"),
                itemLabel: (summary, index) =>
                  t("study.sessionHistoryItem", {
                    number: index,
                    startedAt: formatNextReview(summary.started_at)
                  }),
                itemCounts: (summary) =>
                  t("study.sessionHistoryCounts", {
                    easy: summary.easy_count,
                    again: summary.again_count,
                    hard: summary.hard_count
                  })
              }}
              onExportReport={handleExportStudySessionReport}
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
