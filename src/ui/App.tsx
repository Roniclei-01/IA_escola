import { useTranslation } from "react-i18next";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  cancel,
  isPermissionGranted,
  requestPermission,
  Schedule,
  sendNotification
} from "@tauri-apps/plugin-notification";
import {
  importTextBook as defaultImportTextBook,
  type ImportTextBookResponse
} from "../infrastructure/tauri/import-text-book";
import { archiveImportedDocument as defaultArchiveImportedDocument } from "../infrastructure/tauri/archive-imported-document";
import {
  deleteImportedDocument as defaultDeleteImportedDocument,
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
import {
  generateStudyCardsWithOllama,
  type GenerateStudyCardsOptions,
  type GenerateStudyCardsProgress,
  type GenerateStudyCardsQueueProgress
} from "../infrastructure/tauri/generate-study-cards";
import {
  translateDocument as defaultTranslateDocument,
  type TranslationProviderId,
  type TranslateDocumentRequest,
  type TranslateDocumentResponse
} from "../infrastructure/tauri/translate-document";
import {
  renderPdfPage as defaultRenderPdfPage,
  type RenderPdfPageRequest,
  type RenderPdfPageResponse
} from "../infrastructure/tauri/render-pdf-page";
import {
  loadPdfReaderPreference as defaultLoadPdfReaderPreference,
  savePdfReaderPreference as defaultSavePdfReaderPreference,
  type PdfReaderPreference
} from "../infrastructure/tauri/pdf-reader-preferences";
import {
  loadDocumentTranslation as defaultLoadDocumentTranslation,
  type LoadDocumentTranslationResponse
} from "../infrastructure/tauri/load-document-translation";
import {
  listDocumentPageTranslations as defaultListDocumentPageTranslations,
  type ListDocumentPageTranslationsResponse
} from "../infrastructure/tauri/list-document-page-translations";
import {
  deleteStudyCards as defaultDeleteStudyCards,
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
import {
  loadStudyGoal as defaultLoadStudyGoal,
  saveStudyGoal as defaultSaveStudyGoal,
  type StudyGoal
} from "../infrastructure/tauri/study-goals";
import {
  loadDocumentStudyMetadata as defaultLoadDocumentStudyMetadata,
  saveDocumentStudyMetadata as defaultSaveDocumentStudyMetadata,
  type DocumentStudyMetadata
} from "../infrastructure/tauri/document-study-metadata";
import {
  archiveStudyCategory as defaultArchiveStudyCategory,
  deleteStudyCategory as defaultDeleteStudyCategory,
  listStudyCategories as defaultListStudyCategories,
  restoreStudyCategory as defaultRestoreStudyCategory,
  saveStudyCategory as defaultSaveStudyCategory,
  type StudyCategory
} from "../infrastructure/tauri/study-categories";
import {
  loadStudyCategoryDefault as defaultLoadStudyCategoryDefault,
  saveStudyCategoryDefault as defaultSaveStudyCategoryDefault,
  type StudyCategoryDefault
} from "../infrastructure/tauri/study-category-default";
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
import {
  loadNotificationSettings as defaultLoadNotificationSettings,
  saveNotificationSettings as defaultSaveNotificationSettings,
  type NotificationSettings
} from "../infrastructure/tauri/notification-settings";
import {
  testOcrDependencies as defaultTestOcrDependencies,
  type OcrDependencies
} from "../infrastructure/tauri/ocr-dependencies";
import {
  exportAnkiPackage as defaultExportAnkiPackage,
  type ExportAnkiPackageResponse
} from "../infrastructure/tauri/export-anki-package";
import { exportTextFile as defaultExportTextFile } from "../infrastructure/tauri/export-text-file";
import {
  addMeditationNote as defaultAddMeditationNote,
  deleteMeditationNote as defaultDeleteMeditationNote,
  loadMeditationNotes as defaultLoadMeditationNotes,
  updateMeditationNote as defaultUpdateMeditationNote,
  type MeditationNote,
  type MeditationNotesResponse
} from "../infrastructure/tauri/meditation-notes";
import {
  SUPPORTED_UI_LANGUAGES,
  UI_LANGUAGE_STORAGE_KEY,
  type UiLanguage
} from "../i18n";
import { ImportPanel } from "./components/ImportPanel";
import {
  DocumentSummary,
  type ReaderPageTranslationRequest,
  type ReaderPageTranslationSource
} from "./components/DocumentSummary";
import { StudyCardViewer, type CardReview } from "./components/StudyCardViewer";
import { SavedDocumentsList } from "./components/SavedDocumentsList";
import { OllamaSettingsPanel } from "./components/OllamaSettingsPanel";
import { StudyReviewHistory } from "./components/StudyReviewHistory";
import { DueStudyQueue, type DueStudyQueueItem } from "./components/DueStudyQueue";
import { StudySessionHistory } from "./components/StudySessionHistory";
import { ArchivedDocumentsList } from "./components/ArchivedDocumentsList";
import { OcrDependenciesPanel } from "./components/OcrDependenciesPanel";

interface AppProps {
  importTextBook?: (
    filePath: string,
    options?: { ocrEnabled?: boolean; ocrLanguage?: "por" | "eng" | "spa" }
  ) => Promise<ImportTextBookResponse>;
  archiveImportedDocument?: (documentId: string) => Promise<{ document_id: string }>;
  listArchivedDocuments?: () => Promise<ListArchivedDocumentsResponse>;
  restoreImportedDocument?: (documentId: string) => Promise<{ document_id: string }>;
  deleteImportedDocument?: (documentId: string) => Promise<{ document_id: string }>;
  listImportedDocuments?: () => Promise<ListImportedDocumentsResponse>;
  listDocumentChunks?: (documentId: string) => Promise<ListDocumentChunksResponse>;
  chunkTextDocument?: (
    request: ReturnType<typeof toChunkRequest>
  ) => Promise<ChunkTextDocumentResponse>;
  generateCards?: (
    chunks: ImportedDocumentChunk[],
    options?: GenerateStudyCardsOptions
  ) => Promise<StudyCard[]>;
  translateDocument?: (request: TranslateDocumentRequest) => Promise<TranslateDocumentResponse>;
  renderPdfPage?: (request: RenderPdfPageRequest) => Promise<RenderPdfPageResponse>;
  loadPdfReaderPreference?: (documentId: string) => Promise<PdfReaderPreference>;
  savePdfReaderPreference?: (preference: PdfReaderPreference) => Promise<PdfReaderPreference>;
  loadDocumentTranslation?: (
    documentId: string,
    targetLanguage: ImportTextBookResponse["language"],
    pageIndex?: number
  ) => Promise<LoadDocumentTranslationResponse>;
  listDocumentPageTranslations?: (
    documentId: string,
    targetLanguage: ImportTextBookResponse["language"]
  ) => Promise<ListDocumentPageTranslationsResponse>;
  saveStudyCards?: (cards: StudyCard[]) => Promise<StudyCard[]>;
  deleteStudyCards?: (documentId: string) => Promise<{ document_id: string; deleted_cards: number }>;
  listStudyCards?: (documentId: string) => Promise<StudyCard[]>;
  saveStudyReview?: (
    cardId: string,
    rating: StudyReviewRating,
    sessionId?: string | null
  ) => Promise<StudyReview>;
  listStudyReviews?: (documentId: string) => Promise<StudyReview[]>;
  startStudySession?: (documentId: string) => Promise<StudySession>;
  listStudySessionSummaries?: (documentId: string) => Promise<StudySessionSummary[]>;
  loadStudyGoal?: (documentId: string) => Promise<StudyGoal | null>;
  saveStudyGoal?: (
    documentId: string,
    targetReviews: number,
    recurrence: StudyGoalRecurrence
  ) => Promise<StudyGoal>;
  loadDocumentStudyMetadata?: (documentId: string) => Promise<DocumentStudyMetadata | null>;
  listStudyCategories?: (options?: { includeArchived?: boolean }) => Promise<{
    categories: StudyCategory[];
  }>;
  loadStudyCategoryDefault?: () => Promise<StudyCategoryDefault>;
  saveStudyCategoryDefault?: (request: StudyCategoryDefault) => Promise<StudyCategoryDefault>;
  saveStudyCategory?: (request: {
    id?: string | null;
    name: string;
    subcategories: string[];
  }) => Promise<StudyCategory>;
  archiveStudyCategory?: (id: string) => Promise<StudyCategory>;
  restoreStudyCategory?: (id: string) => Promise<StudyCategory>;
  deleteStudyCategory?: (id: string) => Promise<StudyCategory>;
  saveDocumentStudyMetadata?: (
    documentId: string,
    category: string,
    subcategory: string,
    description: string
  ) => Promise<DocumentStudyMetadata>;
  selectStudyFile?: () => Promise<string | null>;
  testOllamaConnection?: (request: {
    model: string;
    base_url?: string;
  }) => Promise<TestOllamaConnectionResponse>;
  loadOllamaSettings?: () => Promise<OllamaSettings>;
  saveOllamaSettings?: (settings: OllamaSettings) => Promise<OllamaSettings>;
  loadNotificationSettings?: () => Promise<NotificationSettings>;
  saveNotificationSettings?: (settings: NotificationSettings) => Promise<NotificationSettings>;
  testOcrDependencies?: () => Promise<OcrDependencies>;
  exportAnkiPackage?: (
    fileName: string,
    deckName: string,
    cards: StudyCard[]
  ) => Promise<ExportAnkiPackageResponse | null> | ExportAnkiPackageResponse | null;
  loadMeditationNotes?: (documentId: string) => Promise<MeditationNotesResponse>;
  addMeditationNote?: (documentId: string, content: string) => Promise<MeditationNotesResponse>;
  updateMeditationNote?: (
    documentId: string,
    noteId: string,
    content: string
  ) => Promise<MeditationNotesResponse>;
  deleteMeditationNote?: (
    documentId: string,
    noteId: string
  ) => Promise<MeditationNotesResponse>;
  downloadTextFile?: (fileName: string, content: string) => Promise<void> | void;
  printStudySessionReport?: (fileName: string, html: string) => void;
  notifyStudyGoalReminder?: (notification: StudyGoalReminderNotification) => Promise<void> | void;
  cancelStudyGoalReminder?: () => Promise<void> | void;
  confirmDelete?: (message: string) => boolean;
  enableDevelopmentFallback?: boolean;
}

type OperationStatus =
  | "importingDocument"
  | "chunkingDocument"
  | "generatingCardsWithOllama"
  | "savingStudyCards"
  | "loadingSavedCards"
  | "translatingDocument";

type SourceTypeFilter = "all" | "txt" | "pdf";
type ReviewStatusFilter = "all" | "reviewed" | "pending";
type LibrarySortMode = "oldest" | "newest" | "type" | "status";
type MetricPeriodFilter = "all" | "last7" | "last30";
type StudyGoalRecurrence = StudyGoal["recurrence"];
type DocumentLanguage = ImportTextBookResponse["language"];
type AppView = "library" | "study";
const INITIAL_CARD_GENERATION_CHUNK_LIMIT = 3;
const STUDY_GOAL_REMINDER_NOTIFICATION_ID = 1001;
const DEFAULT_STUDY_CATEGORY = "Geral";
const DEFAULT_STUDY_SUBCATEGORY = "Sem subcategoria";
const ACADEMIC_CATEGORIES = [
  {
    category: DEFAULT_STUDY_CATEGORY,
    subcategories: [DEFAULT_STUDY_SUBCATEGORY]
  },
  {
    category: "Linguagens e Comunicacao",
    subcategories: [
      "Portugues",
      "Redacao",
      "Literatura",
      "Ingles",
      "Espanhol",
      "Comunicacao cientifica"
    ]
  },
  {
    category: "Matematica e Estatistica",
    subcategories: [
      "Matematica basica",
      "Algebra",
      "Geometria",
      "Calculo",
      "Estatistica",
      "Probabilidade",
      "Matematica financeira"
    ]
  },
  {
    category: "Ciencias da Natureza",
    subcategories: [
      "Fisica",
      "Quimica",
      "Biologia",
      "Astronomia",
      "Geologia",
      "Ciencias ambientais"
    ]
  },
  {
    category: "Ciencias Humanas",
    subcategories: [
      "Historia",
      "Geografia",
      "Filosofia",
      "Sociologia",
      "Antropologia",
      "Psicologia"
    ]
  },
  {
    category: "Tecnologia e Computacao",
    subcategories: [
      "Programacao",
      "Redes de computadores",
      "Banco de dados",
      "Seguranca da informacao",
      "Inteligencia artificial",
      "Engenharia de software",
      "Sistemas operacionais"
    ]
  },
  {
    category: "Engenharia e Arquitetura",
    subcategories: [
      "Engenharia civil",
      "Engenharia eletrica",
      "Engenharia mecanica",
      "Engenharia de producao",
      "Arquitetura",
      "Desenho tecnico"
    ]
  },
  {
    category: "Saude",
    subcategories: [
      "Anatomia",
      "Fisiologia",
      "Farmacologia",
      "Enfermagem",
      "Medicina",
      "Nutricao",
      "Saude publica"
    ]
  },
  {
    category: "Negocios e Gestao",
    subcategories: [
      "Administracao",
      "Economia",
      "Contabilidade",
      "Marketing",
      "Financas",
      "Empreendedorismo"
    ]
  },
  {
    category: "Direito e Politicas Publicas",
    subcategories: [
      "Direito constitucional",
      "Direito civil",
      "Direito penal",
      "Direito trabalhista",
      "Direito administrativo",
      "Politicas publicas"
    ]
  },
  {
    category: "Educacao e Pedagogia",
    subcategories: [
      "Didatica",
      "Curriculo",
      "Avaliacao educacional",
      "Psicopedagogia",
      "Educacao inclusiva",
      "Tecnologias educacionais"
    ]
  },
  {
    category: "Artes e Cultura",
    subcategories: [
      "Historia da arte",
      "Musica",
      "Design",
      "Cinema",
      "Teatro",
      "Fotografia"
    ]
  },
  {
    category: "Pesquisa e Metodologia",
    subcategories: [
      "Metodologia cientifica",
      "Projeto de pesquisa",
      "Revisao bibliografica",
      "Normas ABNT/APA",
      "Analise de dados",
      "Escrita academica"
    ]
  }
] as const;
const ACADEMIC_CATEGORY_LABEL_KEYS: Record<string, string> = {
  [DEFAULT_STUDY_CATEGORY]: "library.academicCategories.general",
  "Linguagens e Comunicacao": "library.academicCategories.languages",
  "Matematica e Estatistica": "library.academicCategories.math",
  "Ciencias da Natureza": "library.academicCategories.naturalSciences",
  "Ciencias Humanas": "library.academicCategories.humanities",
  "Tecnologia e Computacao": "library.academicCategories.technology",
  "Engenharia e Arquitetura": "library.academicCategories.engineering",
  Saude: "library.academicCategories.health",
  "Negocios e Gestao": "library.academicCategories.business",
  "Direito e Politicas Publicas": "library.academicCategories.law",
  "Educacao e Pedagogia": "library.academicCategories.education",
  "Artes e Cultura": "library.academicCategories.arts",
  "Pesquisa e Metodologia": "library.academicCategories.research"
};
const ACADEMIC_SUBCATEGORY_LABEL_KEYS: Record<string, string> = {
  [DEFAULT_STUDY_SUBCATEGORY]: "library.academicSubcategories.uncategorized",
  Portugues: "library.academicSubcategories.portuguese",
  Redacao: "library.academicSubcategories.writing",
  Literatura: "library.academicSubcategories.literature",
  Ingles: "library.academicSubcategories.english",
  Espanhol: "library.academicSubcategories.spanish",
  "Comunicacao cientifica": "library.academicSubcategories.scientificCommunication",
  "Matematica basica": "library.academicSubcategories.basicMath",
  Algebra: "library.academicSubcategories.algebra",
  Geometria: "library.academicSubcategories.geometry",
  Calculo: "library.academicSubcategories.calculus",
  Estatistica: "library.academicSubcategories.statistics",
  Probabilidade: "library.academicSubcategories.probability",
  "Matematica financeira": "library.academicSubcategories.financialMath",
  Fisica: "library.academicSubcategories.physics",
  Quimica: "library.academicSubcategories.chemistry",
  Biologia: "library.academicSubcategories.biology",
  Astronomia: "library.academicSubcategories.astronomy",
  Geologia: "library.academicSubcategories.geology",
  "Ciencias ambientais": "library.academicSubcategories.environmentalSciences",
  Historia: "library.academicSubcategories.history",
  Geografia: "library.academicSubcategories.geography",
  Filosofia: "library.academicSubcategories.philosophy",
  Sociologia: "library.academicSubcategories.sociology",
  Antropologia: "library.academicSubcategories.anthropology",
  Psicologia: "library.academicSubcategories.psychology",
  Programacao: "library.academicSubcategories.programming",
  "Redes de computadores": "library.academicSubcategories.computerNetworks",
  "Banco de dados": "library.academicSubcategories.databases",
  "Seguranca da informacao": "library.academicSubcategories.informationSecurity",
  "Inteligencia artificial": "library.academicSubcategories.artificialIntelligence",
  "Engenharia de software": "library.academicSubcategories.softwareEngineering",
  "Sistemas operacionais": "library.academicSubcategories.operatingSystems",
  "Engenharia civil": "library.academicSubcategories.civilEngineering",
  "Engenharia eletrica": "library.academicSubcategories.electricalEngineering",
  "Engenharia mecanica": "library.academicSubcategories.mechanicalEngineering",
  "Engenharia de producao": "library.academicSubcategories.productionEngineering",
  Arquitetura: "library.academicSubcategories.architecture",
  "Desenho tecnico": "library.academicSubcategories.technicalDrawing",
  Anatomia: "library.academicSubcategories.anatomy",
  Fisiologia: "library.academicSubcategories.physiology",
  Farmacologia: "library.academicSubcategories.pharmacology",
  Enfermagem: "library.academicSubcategories.nursing",
  Medicina: "library.academicSubcategories.medicine",
  Nutricao: "library.academicSubcategories.nutrition",
  "Saude publica": "library.academicSubcategories.publicHealth",
  Administracao: "library.academicSubcategories.administration",
  Economia: "library.academicSubcategories.economics",
  Contabilidade: "library.academicSubcategories.accounting",
  Marketing: "library.academicSubcategories.marketing",
  Financas: "library.academicSubcategories.finance",
  Empreendedorismo: "library.academicSubcategories.entrepreneurship",
  "Direito constitucional": "library.academicSubcategories.constitutionalLaw",
  "Direito civil": "library.academicSubcategories.civilLaw",
  "Direito penal": "library.academicSubcategories.criminalLaw",
  "Direito trabalhista": "library.academicSubcategories.laborLaw",
  "Direito administrativo": "library.academicSubcategories.administrativeLaw",
  "Politicas publicas": "library.academicSubcategories.publicPolicy",
  Didatica: "library.academicSubcategories.didactics",
  Curriculo: "library.academicSubcategories.curriculum",
  "Avaliacao educacional": "library.academicSubcategories.educationalAssessment",
  Psicopedagogia: "library.academicSubcategories.psychopedagogy",
  "Educacao inclusiva": "library.academicSubcategories.inclusiveEducation",
  "Tecnologias educacionais": "library.academicSubcategories.educationalTechnologies",
  "Historia da arte": "library.academicSubcategories.artHistory",
  Musica: "library.academicSubcategories.music",
  Design: "library.academicSubcategories.design",
  Cinema: "library.academicSubcategories.cinema",
  Teatro: "library.academicSubcategories.theater",
  Fotografia: "library.academicSubcategories.photography",
  "Metodologia cientifica": "library.academicSubcategories.scientificMethodology",
  "Projeto de pesquisa": "library.academicSubcategories.researchProject",
  "Revisao bibliografica": "library.academicSubcategories.literatureReview",
  "Normas ABNT/APA": "library.academicSubcategories.abntApaStandards",
  "Analise de dados": "library.academicSubcategories.dataAnalysis",
  "Escrita academica": "library.academicSubcategories.academicWriting"
};
const LANGUAGE_MARKERS: Record<DocumentLanguage, string[]> = {
  Pt: [
    "que",
    "para",
    "com",
    "uma",
    "um",
    "de",
    "do",
    "da",
    "nao",
    "livro",
    "conteudo",
    "pessoas"
  ],
  En: [
    "the",
    "and",
    "of",
    "to",
    "in",
    "that",
    "this",
    "is",
    "are",
    "with",
    "from",
    "for",
    "book",
    "people"
  ],
  Es: ["que", "para", "con", "una", "un", "de", "del", "libro", "contenido", "personas"]
};

function normalizeUiLanguage(language: string): UiLanguage {
  const shortLanguage = language.split("-")[0] as UiLanguage;

  return SUPPORTED_UI_LANGUAGES.includes(shortLanguage) ? shortLanguage : "pt";
}

function persistUiLanguage(language: UiLanguage) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage?.setItem(UI_LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Some embedded runtimes disable localStorage; language still changes for the session.
  }
}

function defaultReaderTargetLanguage(
  sourceLanguage: ImportTextBookResponse["language"]
): ImportTextBookResponse["language"] {
  return sourceLanguage === "En" ? "Pt" : "En";
}

function hasUsableTranslationContent(
  translation: TranslateDocumentResponse | null | undefined
): translation is TranslateDocumentResponse {
  return Boolean(translation?.translated_content.trim());
}

function inferDocumentLanguage(document: ImportTextBookResponse): DocumentLanguage {
  const words = document.content
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return document.language;
  }

  const wordCounts: Record<string, number> = {};
  for (const word of words) {
    wordCounts[word] = (wordCounts[word] ?? 0) + 1;
  }

  const scores = Object.fromEntries(
    Object.entries(LANGUAGE_MARKERS).map(([language, markers]) => [
      language,
      markers.reduce((score, marker) => score + (wordCounts[marker] ?? 0), 0)
    ])
  ) as Record<DocumentLanguage, number>;
  const inferredLanguage = (Object.keys(scores) as DocumentLanguage[]).reduce(
    (bestLanguage, language) => (scores[language] > scores[bestLanguage] ? language : bestLanguage)
  );

  return scores[inferredLanguage] >= 4 &&
    scores[inferredLanguage] >= scores[document.language] + 2
    ? inferredLanguage
    : document.language;
}

interface StudyGoalReminderNotification {
  title: string;
  body: string;
  recurrence: StudyGoalRecurrence;
  reminderTime: string;
}

function parseReminderTime(reminderTime: string): { hour: number; minute: number } | null {
  const [hourValue, minuteValue] = reminderTime.split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return { hour, minute };
}

function scheduleForStudyGoalRecurrence(
  recurrence: StudyGoalRecurrence,
  reminderTime: string
): Schedule | undefined {
  const parsedReminderTime = parseReminderTime(reminderTime);

  if (!parsedReminderTime) {
    return undefined;
  }

  if (recurrence === "daily") {
    return Schedule.interval(parsedReminderTime);
  }

  if (recurrence === "weekly") {
    const currentWeekday = new Date().getDay() + 1;

    return Schedule.interval({
      ...parsedReminderTime,
      weekday: currentWeekday
    });
  }

  return undefined;
}

async function defaultNotifyStudyGoalReminder(
  notification: StudyGoalReminderNotification
): Promise<void> {
  let permissionGranted = await isPermissionGranted();

  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }

  if (permissionGranted) {
    const schedule = scheduleForStudyGoalRecurrence(
      notification.recurrence,
      notification.reminderTime
    );

    sendNotification({
      id: STUDY_GOAL_REMINDER_NOTIFICATION_ID,
      title: notification.title,
      body: notification.body,
      ...(schedule ? { schedule } : {})
    });
  }
}

async function defaultCancelStudyGoalReminder(): Promise<void> {
  await cancel([STUDY_GOAL_REMINDER_NOTIFICATION_ID]);
}

interface DocumentProgressSummary {
  documentId: string;
  title: string;
  sessionCount: number;
  reviewCount: number;
  accuracyPercent: number;
  isTopReviewed: boolean;
}

interface RetentionMetrics {
  retentionPercent: number;
  hardCardCount: number;
  hardCards: Array<{
    cardId: string;
    front: string;
    rating: StudyReviewRating;
    priority: number;
  }>;
}

interface SessionTrend {
  firstRetentionPercent: number;
  latestRetentionPercent: number;
  status: "improving" | "stable" | "declining";
}

interface HardCardPeriodTrend {
  status: "reduction" | "stable" | "increase";
  periods: Array<{
    label: string;
    difficultCount: number;
  }>;
}

interface StudyMetricPeriodSummary {
  sessionCount: number;
  reviewCount: number;
  easyCount: number;
  difficultCount: number;
}

interface StudyGoalProgress {
  completedReviews: number;
  targetReviews: number;
  remainingReviews: number;
  percent: number;
}

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

function buildRetentionMetrics(cards: StudyCard[], reviews: StudyReview[]): RetentionMetrics {
  const totalReviews = reviews.length;
  const easyReviews = reviews.filter((review) => review.rating === "easy").length;
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const hardestReviewsByCard = reviews.reduce<Record<string, StudyReview>>((reviewsByCard, review) => {
    if (review.rating === "easy") {
      return reviewsByCard;
    }

    const currentReview = reviewsByCard[review.card_id];
    if (!currentReview || review.priority > currentReview.priority) {
      reviewsByCard[review.card_id] = review;
    }

    return reviewsByCard;
  }, {});

  return {
    retentionPercent: totalReviews > 0 ? Math.round((easyReviews / totalReviews) * 100) : 0,
    hardCardCount: Object.keys(hardestReviewsByCard).length,
    hardCards: Object.values(hardestReviewsByCard)
      .map((review) => ({
        cardId: review.card_id,
        front: cardsById.get(review.card_id)?.front ?? review.card_id,
        rating: review.rating,
        priority: review.priority
      }))
      .sort((firstCard, secondCard) => secondCard.priority - firstCard.priority)
      .slice(0, 3)
  };
}

function sessionRetentionPercent(summary: StudySessionSummary): number {
  const totalReviews = summary.easy_count + summary.hard_count + summary.again_count;
  return totalReviews > 0 ? Math.round((summary.easy_count / totalReviews) * 100) : 0;
}

function buildSessionTrend(summaries: StudySessionSummary[]): SessionTrend | null {
  const completedSummaries = summaries.filter(
    (summary) => summary.easy_count + summary.hard_count + summary.again_count > 0
  );

  if (completedSummaries.length < 2) {
    return null;
  }

  const firstRetentionPercent = sessionRetentionPercent(completedSummaries[0]);
  const latestRetentionPercent = sessionRetentionPercent(
    completedSummaries[completedSummaries.length - 1]
  );

  let status: SessionTrend["status"] = "stable";
  if (latestRetentionPercent > firstRetentionPercent) {
    status = "improving";
  } else if (latestRetentionPercent < firstRetentionPercent) {
    status = "declining";
  }

  return {
    firstRetentionPercent,
    latestRetentionPercent,
    status
  };
}

function difficultCountFromSummary(summary: StudySessionSummary): number {
  return summary.again_count + summary.hard_count;
}

function completedStudySessionSummaries(summaries: StudySessionSummary[]): StudySessionSummary[] {
  return summaries.filter(
    (summary) => summary.easy_count + summary.hard_count + summary.again_count > 0
  );
}

function filterStudySummariesByMetricPeriod(
  summaries: StudySessionSummary[],
  periodFilter: MetricPeriodFilter
): StudySessionSummary[] {
  const completedSummaries = completedStudySessionSummaries(summaries);

  if (periodFilter === "all" || completedSummaries.length === 0) {
    return completedSummaries;
  }

  const referenceStartedAt = Math.max(...completedSummaries.map((summary) => summary.started_at));
  const periodDays = periodFilter === "last7" ? 7 : 30;
  const cutoffStartedAt = referenceStartedAt - periodDays * 24 * 60 * 60;

  return completedSummaries.filter((summary) => summary.started_at >= cutoffStartedAt);
}

function buildStudyMetricPeriodSummary(
  summaries: StudySessionSummary[]
): StudyMetricPeriodSummary | null {
  if (summaries.length === 0) {
    return null;
  }

  const easyCount = summaries.reduce((total, summary) => total + summary.easy_count, 0);
  const difficultCount = summaries.reduce(
    (total, summary) => total + difficultCountFromSummary(summary),
    0
  );

  return {
    sessionCount: summaries.length,
    reviewCount: easyCount + difficultCount,
    easyCount,
    difficultCount
  };
}

function totalReviewsFromSummaries(summaries: StudySessionSummary[]): number {
  return completedStudySessionSummaries(summaries).reduce(
    (total, summary) =>
      total + summary.easy_count + summary.hard_count + summary.again_count,
    0
  );
}

function filterSummariesByStudyGoalRecurrence(
  summaries: StudySessionSummary[],
  recurrence: StudyGoalRecurrence
): StudySessionSummary[] {
  if (recurrence === "all") {
    return summaries;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const daySeconds = 24 * 60 * 60;
  const minimumStartedAt =
    recurrence === "daily" ? nowSeconds - daySeconds : nowSeconds - 7 * daySeconds;

  return summaries.filter((summary) => summary.started_at >= minimumStartedAt);
}

function buildStudyGoalProgress(
  summaries: StudySessionSummary[],
  targetReviews: number | undefined,
  recurrence: StudyGoalRecurrence
): StudyGoalProgress | null {
  if (!targetReviews || targetReviews <= 0) {
    return null;
  }

  const completedReviews = totalReviewsFromSummaries(
    filterSummariesByStudyGoalRecurrence(summaries, recurrence)
  );

  return {
    completedReviews,
    targetReviews,
    remainingReviews: Math.max(0, targetReviews - completedReviews),
    percent: Math.min(100, Math.round((completedReviews / targetReviews) * 100))
  };
}

function studyGoalAlertKey(recurrence: StudyGoalRecurrence): string | null {
  if (recurrence === "daily") {
    return "study.goalAlertDaily";
  }

  if (recurrence === "weekly") {
    return "study.goalAlertWeekly";
  }

  return null;
}

function buildHardCardPeriodTrend(summaries: StudySessionSummary[]): HardCardPeriodTrend | null {
  const weekSeconds = 7 * 24 * 60 * 60;
  const completedSummaries = completedStudySessionSummaries(summaries);
  const difficultCountsByWeek = completedSummaries.reduce<Record<number, number>>(
    (countsByWeek, summary) => {
      const weekKey = Math.floor(summary.started_at / weekSeconds);
      countsByWeek[weekKey] = (countsByWeek[weekKey] ?? 0) + difficultCountFromSummary(summary);
      return countsByWeek;
    },
    {}
  );
  const weekEntries = Object.entries(difficultCountsByWeek)
    .map(([weekKey, difficultCount]) => ({
      weekKey: Number(weekKey),
      difficultCount
    }))
    .sort((firstPeriod, secondPeriod) => firstPeriod.weekKey - secondPeriod.weekKey);

  if (weekEntries.length < 2) {
    return null;
  }

  const firstDifficultCount = weekEntries[0].difficultCount;
  const latestDifficultCount = weekEntries[weekEntries.length - 1].difficultCount;
  let status: HardCardPeriodTrend["status"] = "stable";

  if (latestDifficultCount < firstDifficultCount) {
    status = "reduction";
  } else if (latestDifficultCount > firstDifficultCount) {
    status = "increase";
  }

  return {
    status,
    periods: weekEntries.map((period, index) => ({
      label: `Periodo ${index + 1}`,
      difficultCount: period.difficultCount
    }))
  };
}

function getDocumentTitle(document: ImportTextBookResponse): string {
  return document.content.split("\n")[0]?.trim() || document.source_path || document.document_id;
}

function buildDocumentProgressSummaries(
  documents: ImportTextBookResponse[],
  summariesByDocument: Record<string, StudySessionSummary[]>
): DocumentProgressSummary[] {
  const summaries = documents.map((document) => {
    const sessionSummaries = summariesByDocument[document.document_id] ?? [];
    const easyCount = sessionSummaries.reduce((total, summary) => total + summary.easy_count, 0);
    const reviewCount = sessionSummaries.reduce(
      (total, summary) => total + summary.easy_count + summary.hard_count + summary.again_count,
      0
    );

    return {
      documentId: document.document_id,
      title: getDocumentTitle(document),
      sessionCount: sessionSummaries.length,
      reviewCount,
      accuracyPercent: reviewCount > 0 ? Math.round((easyCount / reviewCount) * 100) : 0,
      isTopReviewed: false
    };
  });

  const visibleSummaries = summaries.filter(
    (summary) => summary.sessionCount > 0 || summary.reviewCount > 0
  );

  const sortedSummaries = visibleSummaries.sort((firstSummary, secondSummary) => {
    if (secondSummary.reviewCount !== firstSummary.reviewCount) {
      return secondSummary.reviewCount - firstSummary.reviewCount;
    }

    if (secondSummary.sessionCount !== firstSummary.sessionCount) {
      return secondSummary.sessionCount - firstSummary.sessionCount;
    }

    return firstSummary.title.localeCompare(secondSummary.title);
  });

  return sortedSummaries.map((summary, index) => ({
    ...summary,
    isTopReviewed: index === 0 && summary.reviewCount > 0
  }));
}

function incrementSessionSummaryReview(
  summary: StudySessionSummary,
  review: CardReview
): StudySessionSummary {
  return {
    ...summary,
    again_count: summary.again_count + (review === "again" ? 1 : 0),
    hard_count: summary.hard_count + (review === "hard" ? 1 : 0),
    easy_count: summary.easy_count + (review === "easy" ? 1 : 0)
  };
}

function isRunningInsideTauri(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const tauriWindow = window as unknown as {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };

  return Boolean(tauriWindow.__TAURI__ || tauriWindow.__TAURI_INTERNALS__);
}

function browserDownloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function defaultDownloadTextFile(fileName: string, content: string) {
  if (isRunningInsideTauri()) {
    await defaultExportTextFile(fileName, content);
    return;
  }

  browserDownloadTextFile(fileName, content);
}

function defaultPrintStudySessionReport(fileName: string, html: string) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!printWindow) {
    void defaultDownloadTextFile(fileName.replace(/\.pdf$/, ".html"), html);
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function sanitizeReportFileName(value: string): string {
  const normalizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedValue || "documento";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function buildPrintableStudySessionReport(
  document: ImportTextBookResponse,
  summaries: StudySessionSummary[]
): string {
  const documentTitle = document.content.split("\n")[0]?.trim() || "Documento";
  const totalAgain = summaries.reduce((total, summary) => total + summary.again_count, 0);
  const totalHard = summaries.reduce((total, summary) => total + summary.hard_count, 0);
  const totalEasy = summaries.reduce((total, summary) => total + summary.easy_count, 0);
  const totalReviews = totalAgain + totalHard + totalEasy;
  const easyPercent = totalReviews > 0 ? Math.round((totalEasy / totalReviews) * 100) : 0;
  const hardPercent = totalReviews > 0 ? Math.round((totalHard / totalReviews) * 100) : 0;
  const againPercent = totalReviews > 0 ? Math.round((totalAgain / totalReviews) * 100) : 0;
  const sessionRows = summaries
    .map((summary, index) => {
      const startedAt = formatNextReview(summary.started_at);

      return `
        <tr>
          <td>Sessao ${index + 1}</td>
          <td>${escapeHtml(startedAt)}</td>
          <td>${summary.easy_count}</td>
          <td>${summary.hard_count}</td>
          <td>${summary.again_count}</td>
        </tr>`;
    })
    .join("");
  const sessionTrendRows = summaries
    .map((summary, index) => {
      const sessionTotal = summary.easy_count + summary.hard_count + summary.again_count;
      const sessionAccuracy =
        sessionTotal > 0 ? Math.round((summary.easy_count / sessionTotal) * 100) : 0;

      return `
        <div class="session-trend-row">
          <span class="chart-label">Sessao ${index + 1}</span>
          <div class="chart-track"><div class="chart-bar easy" style="width: ${sessionAccuracy}%"></div></div>
          <span class="chart-value">${sessionAccuracy}% acertos</span>
        </div>`;
    })
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Relatorio de estudo - ${escapeHtml(documentTitle)}</title>
    <style>
      @page {
        margin: 18mm 16mm 22mm;
        @bottom-center {
          color: #6b776f;
          content: "Pagina " counter(page) " de " counter(pages);
          font-size: 10px;
        }
      }
      body { color: #17201b; font-family: Arial, sans-serif; line-height: 1.45; }
      h1 { margin: 0; font-size: 26px; }
      h2 { margin: 28px 0 12px; font-size: 18px; break-after: avoid; }
      .report-cover {
        margin-bottom: 18px;
        padding: 18px;
        border: 1px solid #cbd8ce;
        border-radius: 8px;
        background: #f4f7f3;
        break-inside: avoid;
      }
      .report-cover p { margin: 8px 0 0; color: #536259; }
      .meta, .summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .box { border: 1px solid #dce2dc; border-radius: 6px; padding: 10px; break-inside: avoid; }
      .performance-chart { display: grid; gap: 10px; break-inside: avoid; }
      .chart-row { display: grid; grid-template-columns: 92px 1fr 48px; align-items: center; gap: 10px; }
      .session-trend-chart { display: grid; gap: 10px; break-inside: avoid; }
      .session-trend-row { display: grid; grid-template-columns: 92px 1fr 84px; align-items: center; gap: 10px; }
      .chart-label { color: #536259; font-size: 12px; font-weight: 700; }
      .chart-track { height: 14px; overflow: hidden; border-radius: 999px; background: #edf1ee; }
      .chart-bar { height: 100%; border-radius: 999px; }
      .chart-bar.easy { background: #2f7d56; }
      .chart-bar.hard { background: #c78f21; }
      .chart-bar.again { background: #b84a4a; }
      .chart-value { color: #17201b; font-size: 12px; font-weight: 700; text-align: right; }
      strong { display: block; color: #536259; font-size: 11px; text-transform: uppercase; }
      span { display: block; margin-top: 4px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; }
      th, td { border: 1px solid #dce2dc; padding: 8px; text-align: left; }
      th { background: #f4f7f3; }
    </style>
  </head>
  <body>
    <header class="report-cover">
      <h1>Relatorio de estudo - ${escapeHtml(documentTitle)}</h1>
      <p>Resumo imprimivel das sessoes, retencao e volume de revisoes deste documento.</p>
    </header>
    <section class="meta">
      <div class="box"><strong>Documento</strong><span>${escapeHtml(documentTitle)}</span></div>
      <div class="box"><strong>Origem</strong><span>${escapeHtml(document.source_path ?? "Nao informada")}</span></div>
      <div class="box"><strong>Tipo</strong><span>${escapeHtml(document.source_type ?? "txt")}</span></div>
      <div class="box"><strong>Sessoes</strong><span>${summaries.length}</span></div>
    </section>
    <h2>Resumo</h2>
    <section class="summary">
      <div class="box"><strong>Revisoes</strong><span>${totalReviews}</span></div>
      <div class="box"><strong>Acertos</strong><span>${totalEasy}</span></div>
      <div class="box"><strong>Dificeis</strong><span>${totalHard}</span></div>
      <div class="box"><strong>Erros</strong><span>${totalAgain}</span></div>
    </section>
    <h2>Grafico de desempenho</h2>
    <section class="performance-chart" aria-label="Grafico de desempenho">
      <div class="chart-row">
        <span class="chart-label">Acertos</span>
        <div class="chart-track"><div class="chart-bar easy" style="width: ${easyPercent}%"></div></div>
        <span class="chart-value">${easyPercent}%</span>
      </div>
      <div class="chart-row">
        <span class="chart-label">Dificeis</span>
        <div class="chart-track"><div class="chart-bar hard" style="width: ${hardPercent}%"></div></div>
        <span class="chart-value">${hardPercent}%</span>
      </div>
      <div class="chart-row">
        <span class="chart-label">Erros</span>
        <div class="chart-track"><div class="chart-bar again" style="width: ${againPercent}%"></div></div>
        <span class="chart-value">${againPercent}%</span>
      </div>
    </section>
    <h2>Tendencia por sessao</h2>
    <section class="session-trend-chart" aria-label="Tendencia por sessao">
      ${sessionTrendRows}
    </section>
    <h2>Sessoes</h2>
    <table>
      <thead>
        <tr>
          <th>Sessao</th>
          <th>Inicio</th>
          <th>Acertos</th>
          <th>Dificeis</th>
          <th>Erros</th>
        </tr>
      </thead>
      <tbody>${sessionRows}</tbody>
    </table>
  </body>
</html>`;
}

function toAnkiField(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toAnkiTags(tags: string[]): string {
  return tags
    .map((tag) => tag.trim().replace(/\s+/g, "_"))
    .filter(Boolean)
    .join(" ");
}

function toAnkiTag(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
}

function toAnkiGuid(card: StudyCard): string {
  return toAnkiTag(`estudo_ia_local_${card.id}`);
}

function buildAnkiTsv(cards: StudyCard[], document: ImportTextBookResponse): string {
  const documentTag = toAnkiTag(`document_${document.document_id}`);
  const sourceTypeTag = toAnkiTag(`source_${document.source_type ?? "txt"}`);
  const headers = [
    "#separator:tab",
    "#html:false",
    "#notetype:Basic",
    "#guid column:1",
    "#columns:GUID Front Back Tags"
  ];
  const rows = cards.map((card) =>
    [
      toAnkiGuid(card),
      toAnkiField(card.front),
      toAnkiField(card.back),
      toAnkiTags(["estudo_ia_local", documentTag, sourceTypeTag, ...card.tags])
    ].join("\t")
  );

  return [...headers, ...rows].join("\n");
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
  reviewCounts: Record<string, number>,
  metadataByDocumentId: Record<string, DocumentStudyMetadata>,
  categoryFilter: string,
  subcategoryFilter: string
): ImportTextBookResponse[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const normalizedCategoryFilter = categoryFilter.trim().toLowerCase();
  const normalizedSubcategoryFilter = subcategoryFilter.trim().toLowerCase();

  return documents
    .map((savedDocument, originalIndex) => ({ savedDocument, originalIndex }))
    .filter(({ savedDocument }) => {
      const sourceType = savedDocument.source_type ?? "txt";
      const reviewCount = reviewCounts[savedDocument.document_id] ?? 0;
      const metadata = getDocumentStudyClassification(savedDocument, metadataByDocumentId);
      const searchableText =
        `${savedDocument.content} ${savedDocument.source_path ?? ""}`.toLowerCase();

      if (sourceTypeFilter !== "all" && sourceType !== sourceTypeFilter) {
        return false;
      }

      if (normalizedQuery && !searchableText.includes(normalizedQuery)) {
        return false;
      }

      if (
        normalizedCategoryFilter &&
        metadata?.category.trim().toLowerCase() !== normalizedCategoryFilter
      ) {
        return false;
      }

      if (
        normalizedSubcategoryFilter &&
        metadata?.subcategory.trim().toLowerCase() !== normalizedSubcategoryFilter
      ) {
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

function uniqueSortedValues(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  ).sort((firstValue, secondValue) => firstValue.localeCompare(secondValue));
}

function parseSubcategoryDraft(value: string): string[] {
  return uniqueSortedValues(value.split(/[\n,]/));
}

function getAcademicSubcategories(category: string): string[] {
  const normalizedCategory = category.trim().toLowerCase();
  const academicCategory = ACADEMIC_CATEGORIES.find(
    (item) => item.category.toLowerCase() === normalizedCategory
  );

  return academicCategory ? [...academicCategory.subcategories] : [];
}

function getStudySubcategories(category: string, studyCategories: StudyCategory[]): string[] {
  const normalizedCategory = category.trim().toLowerCase();
  const savedCategory = studyCategories.find(
    (item) => item.name.trim().toLowerCase() === normalizedCategory && !item.archived
  );

  return uniqueSortedValues([
    ...getAcademicSubcategories(category),
    ...(savedCategory?.subcategories ?? [])
  ]);
}

function getDefaultSubcategoryForCategory(
  category: string,
  studyCategories: StudyCategory[]
): string {
  return getStudySubcategories(category, studyCategories)[0] ?? DEFAULT_STUDY_SUBCATEGORY;
}

function translateMappedLabel(
  value: string,
  translationKeys: Record<string, string>,
  translate: (key: string) => string
): string {
  const translationKey = translationKeys[value];

  if (!translationKey) {
    return value;
  }

  const translatedValue = translate(translationKey);

  return translatedValue === translationKey ? value : translatedValue;
}

function getAcademicCategoryDisplayName(
  category: string,
  translate: (key: string) => string
): string {
  return translateMappedLabel(category, ACADEMIC_CATEGORY_LABEL_KEYS, translate);
}

function getAcademicSubcategoryDisplayName(
  subcategory: string,
  translate: (key: string) => string
): string {
  return translateMappedLabel(subcategory, ACADEMIC_SUBCATEGORY_LABEL_KEYS, translate);
}

function categoryOptionsFromMetadata(
  metadataByDocumentId: Record<string, DocumentStudyMetadata>,
  studyCategories: StudyCategory[]
) {
  return uniqueSortedValues(
    [
      ...ACADEMIC_CATEGORIES.map((item) => item.category),
      ...studyCategories.filter((category) => !category.archived).map((category) => category.name),
      ...Object.values(metadataByDocumentId).map((metadata) => metadata.category)
    ]
  );
}

function subcategoryOptionsFromMetadata(
  metadataByDocumentId: Record<string, DocumentStudyMetadata>,
  categoryFilter: string,
  studyCategories: StudyCategory[]
) {
  const normalizedCategoryFilter = categoryFilter.trim().toLowerCase();

  return uniqueSortedValues(
    [
      ...getStudySubcategories(categoryFilter, studyCategories),
      ...Object.values(metadataByDocumentId)
        .filter(
          (metadata) =>
            !normalizedCategoryFilter ||
            metadata.category.trim().toLowerCase() === normalizedCategoryFilter
        )
        .map((metadata) => metadata.subcategory)
    ]
  );
}

function getDocumentStudyClassification(
  document: ImportTextBookResponse,
  metadataByDocumentId: Record<string, DocumentStudyMetadata>
): Pick<DocumentStudyMetadata, "category" | "subcategory"> {
  return (
    metadataByDocumentId[document.document_id] ?? {
      category: DEFAULT_STUDY_CATEGORY,
      subcategory: DEFAULT_STUDY_SUBCATEGORY
    }
  );
}

function countDocumentsByCategory(
  documents: ImportTextBookResponse[],
  metadataByDocumentId: Record<string, DocumentStudyMetadata>,
  category: string,
  subcategory?: string
): number {
  const normalizedCategory = category.trim().toLowerCase();
  const normalizedSubcategory = subcategory?.trim().toLowerCase() ?? "";

  return documents.filter((document) => {
    const metadata = getDocumentStudyClassification(document, metadataByDocumentId);
    const matchesCategory = metadata.category.trim().toLowerCase() === normalizedCategory;
    const matchesSubcategory =
      !normalizedSubcategory ||
      metadata.subcategory.trim().toLowerCase() === normalizedSubcategory;

    return matchesCategory && matchesSubcategory;
  }).length;
}

function shouldEnableMockAiFallback() {
  return import.meta.env.VITE_ENABLE_MOCK_AI_FALLBACK === "true";
}

function getErrorMessage(unknownError: unknown, fallbackMessage: string) {
  if (unknownError instanceof Error && unknownError.message.trim().length > 0) {
    return unknownError.message;
  }

  if (typeof unknownError === "string" && unknownError.trim().length > 0) {
    return unknownError;
  }

  return fallbackMessage;
}

function normalizePageIndexes(pageIndexes: number[]) {
  return Array.from(
    new Set(
      pageIndexes.filter((pageIndex) => Number.isInteger(pageIndex) && pageIndex >= 0)
    )
  ).sort((firstPage, secondPage) => firstPage - secondPage);
}

export function App({
  importTextBook = defaultImportTextBook,
  archiveImportedDocument = defaultArchiveImportedDocument,
  listArchivedDocuments = defaultListArchivedDocuments,
  restoreImportedDocument = defaultRestoreImportedDocument,
  deleteImportedDocument = defaultDeleteImportedDocument,
  listImportedDocuments = defaultListImportedDocuments,
  listDocumentChunks = defaultListDocumentChunks,
  chunkTextDocument = defaultChunkTextDocument,
  generateCards = generateStudyCardsWithOllama,
  translateDocument = defaultTranslateDocument,
  renderPdfPage = defaultRenderPdfPage,
  loadPdfReaderPreference = defaultLoadPdfReaderPreference,
  savePdfReaderPreference = defaultSavePdfReaderPreference,
  loadDocumentTranslation = defaultLoadDocumentTranslation,
  listDocumentPageTranslations = defaultListDocumentPageTranslations,
  saveStudyCards = defaultSaveStudyCards,
  deleteStudyCards = defaultDeleteStudyCards,
  listStudyCards = defaultListStudyCards,
  saveStudyReview = defaultSaveStudyReview,
  listStudyReviews = defaultListStudyReviews,
  startStudySession = defaultStartStudySession,
  listStudySessionSummaries = defaultListStudySessionSummaries,
  loadStudyGoal = defaultLoadStudyGoal,
  saveStudyGoal = defaultSaveStudyGoal,
  loadDocumentStudyMetadata = defaultLoadDocumentStudyMetadata,
  listStudyCategories = defaultListStudyCategories,
  loadStudyCategoryDefault = defaultLoadStudyCategoryDefault,
  saveStudyCategoryDefault = defaultSaveStudyCategoryDefault,
  saveStudyCategory = defaultSaveStudyCategory,
  archiveStudyCategory = defaultArchiveStudyCategory,
  restoreStudyCategory = defaultRestoreStudyCategory,
  deleteStudyCategory = defaultDeleteStudyCategory,
  saveDocumentStudyMetadata = defaultSaveDocumentStudyMetadata,
  selectStudyFile = defaultSelectStudyFile,
  testOllamaConnection = defaultTestOllamaConnection,
  loadOllamaSettings = defaultLoadOllamaSettings,
  saveOllamaSettings = defaultSaveOllamaSettings,
  loadNotificationSettings = defaultLoadNotificationSettings,
  saveNotificationSettings = defaultSaveNotificationSettings,
  testOcrDependencies = defaultTestOcrDependencies,
  exportAnkiPackage = defaultExportAnkiPackage,
  loadMeditationNotes = defaultLoadMeditationNotes,
  addMeditationNote = defaultAddMeditationNote,
  updateMeditationNote = defaultUpdateMeditationNote,
  deleteMeditationNote = defaultDeleteMeditationNote,
  downloadTextFile = defaultDownloadTextFile,
  printStudySessionReport = defaultPrintStudySessionReport,
  notifyStudyGoalReminder = defaultNotifyStudyGoalReminder,
  cancelStudyGoalReminder = defaultCancelStudyGoalReminder,
  confirmDelete = (message: string) => window.confirm(message),
  enableDevelopmentFallback = shouldEnableMockAiFallback()
}: AppProps) {
  const { t, i18n } = useTranslation();
  const operationTokenRef = useRef(0);
  const operationAbortControllerRef = useRef<AbortController | null>(null);
  const translationLoadTokenRef = useRef(0);
  const translatedPageIndexesLoadTokenRef = useRef(0);
  const pdfReaderPreferenceTokenRef = useRef(0);
  const meditationLoadTokenRef = useRef(0);
  const documentStudyMetadataLoadTokenRef = useRef(0);
  const activeStudyPanelRef = useRef<HTMLElement | null>(null);
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>(() =>
    normalizeUiLanguage(i18n.language)
  );
  const [filePath, setFilePath] = useState("");
  const [currentView, setCurrentView] = useState<AppView>("library");
  const [isOcrEnabled, setIsOcrEnabled] = useState(false);
  const [ocrLanguage, setOcrLanguage] = useState<"por" | "eng" | "spa">("por");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [operationStatus, setOperationStatus] = useState<OperationStatus | null>(null);
  const [translationOperationPage, setTranslationOperationPage] = useState<{
    currentPage: number;
    totalPages: number;
  } | null>(null);
  const [cardGenerationProgress, setCardGenerationProgress] =
    useState<GenerateStudyCardsProgress | null>(null);
  const [cardGenerationQueueProgress, setCardGenerationQueueProgress] =
    useState<GenerateStudyCardsQueueProgress | null>(null);
  const [document, setDocument] = useState<ImportTextBookResponse | null>(null);
  const [readerTargetLanguage, setReaderTargetLanguage] =
    useState<ImportTextBookResponse["language"]>("En");
  const [translatedDocumentPages, setTranslatedDocumentPages] = useState<Record<number, string>>({});
  const [translatedDocumentPageSources, setTranslatedDocumentPageSources] = useState<
    Record<number, ReaderPageTranslationSource>
  >({});
  const [translatedDocumentPageProviders, setTranslatedDocumentPageProviders] = useState<
    Record<number, TranslationProviderId>
  >({});
  const [translatedReaderPageIndexes, setTranslatedReaderPageIndexes] = useState<number[]>([]);
  const [translationErrorReaderPageIndexes, setTranslationErrorReaderPageIndexes] = useState<
    number[]
  >([]);
  const [pdfReaderPage, setPdfReaderPage] = useState(1);
  const [pdfReaderZoom, setPdfReaderZoom] = useState(1);
  const [readerPage, setReaderPage] = useState(1);
  const [renderedPdfPage, setRenderedPdfPage] = useState<RenderPdfPageResponse | null>(null);
  const [isRenderingPdfPage, setIsRenderingPdfPage] = useState(false);
  const [isReaderPreferenceLoaded, setIsReaderPreferenceLoaded] = useState(false);
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [documentChunks, setDocumentChunks] = useState<ImportedDocumentChunk[]>([]);
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<ImportTextBookResponse[]>([]);
  const [archivedDocuments, setArchivedDocuments] = useState<ImportTextBookResponse[]>([]);
  const [documentReviewCounts, setDocumentReviewCounts] = useState<Record<string, number>>({});
  const [documentSessionSummariesById, setDocumentSessionSummariesById] = useState<
    Record<string, StudySessionSummary[]>
  >({});
  const [documentProgressSummaries, setDocumentProgressSummaries] = useState<
    DocumentProgressSummary[]
  >([]);
  const [documentStudyMetadataById, setDocumentStudyMetadataById] = useState<
    Record<string, DocumentStudyMetadata>
  >({});
  const [studyCategories, setStudyCategories] = useState<StudyCategory[]>([]);
  const [studyCategoryDefault, setStudyCategoryDefault] = useState<StudyCategoryDefault>({
    category: DEFAULT_STUDY_CATEGORY,
    subcategory: DEFAULT_STUDY_SUBCATEGORY
  });
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [selectedSubcategoryFilter, setSelectedSubcategoryFilter] = useState("");
  const [importCategory, setImportCategory] = useState(DEFAULT_STUDY_CATEGORY);
  const [importSubcategory, setImportSubcategory] = useState(DEFAULT_STUDY_SUBCATEGORY);
  const [importCategoryDescriptionDraft, setImportCategoryDescriptionDraft] = useState("");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isBooksPanelOpen, setIsBooksPanelOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [categoryManagerDraftId, setCategoryManagerDraftId] = useState<string | null>(null);
  const [categoryManagerNameDraft, setCategoryManagerNameDraft] = useState("");
  const [categoryManagerSubcategoriesDraft, setCategoryManagerSubcategoriesDraft] = useState("");
  const [isSavingStudyCategory, setIsSavingStudyCategory] = useState(false);
  const [defaultCategoryDraft, setDefaultCategoryDraft] = useState(DEFAULT_STUDY_CATEGORY);
  const [defaultSubcategoryDraft, setDefaultSubcategoryDraft] =
    useState(DEFAULT_STUDY_SUBCATEGORY);
  const [isSavingStudyCategoryDefault, setIsSavingStudyCategoryDefault] = useState(false);
  const [categoryManagerStatus, setCategoryManagerStatus] = useState<string | null>(null);
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceTypeFilter>("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatusFilter>("all");
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [librarySortMode, setLibrarySortMode] = useState<LibrarySortMode>("oldest");
  const [metricPeriodFilter, setMetricPeriodFilter] = useState<MetricPeriodFilter>("all");
  const [isLoadingSavedDocuments, setIsLoadingSavedDocuments] = useState(true);
  const [isLoadingArchivedDocuments, setIsLoadingArchivedDocuments] = useState(true);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [cardReviews, setCardReviews] = useState<Record<string, CardReview>>({});
  const [reviewHistory, setReviewHistory] = useState<StudyReview[]>([]);
  const [activeStudySession, setActiveStudySession] = useState<StudySession | null>(null);
  const [studySessionReviewCount, setStudySessionReviewCount] = useState(0);
  const [studySessionSummaries, setStudySessionSummaries] = useState<StudySessionSummary[]>([]);
  const [printableReportPreviewHtml, setPrintableReportPreviewHtml] = useState<string | null>(null);
  const [studyReviewGoalsByDocumentId, setStudyReviewGoalsByDocumentId] = useState<
    Record<string, number>
  >({});
  const [studyReviewGoalInputsByDocumentId, setStudyReviewGoalInputsByDocumentId] = useState<
    Record<string, string>
  >({});
  const [studyReviewGoalRecurrencesByDocumentId, setStudyReviewGoalRecurrencesByDocumentId] =
    useState<Record<string, StudyGoalRecurrence>>({});
  const [cardReviewSchedules, setCardReviewSchedules] = useState<
    Record<string, { priority: number; nextReviewAt: number }>
  >({});
  const [documentStudyMetadata, setDocumentStudyMetadata] =
    useState<DocumentStudyMetadata | null>(null);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [subcategoryDraft, setSubcategoryDraft] = useState("");
  const [categoryDescriptionDraft, setCategoryDescriptionDraft] = useState("");
  const [isLoadingDocumentStudyMetadata, setIsLoadingDocumentStudyMetadata] = useState(false);
  const [isSavingDocumentStudyMetadata, setIsSavingDocumentStudyMetadata] = useState(false);
  const [documentStudyMetadataStatus, setDocumentStudyMetadataStatus] = useState<string | null>(
    null
  );
  const [meditationNotes, setMeditationNotes] = useState<MeditationNote[]>([]);
  const [meditationDraft, setMeditationDraft] = useState("");
  const [editingMeditationNoteId, setEditingMeditationNoteId] = useState<string | null>(null);
  const [isMeditationPanelOpen, setIsMeditationPanelOpen] = useState(false);
  const [isMeditationEditorOpen, setIsMeditationEditorOpen] = useState(false);
  const [isLoadingMeditationNote, setIsLoadingMeditationNote] = useState(false);
  const [isSavingMeditationNote, setIsSavingMeditationNote] = useState(false);
  const [deletingMeditationNoteId, setDeletingMeditationNoteId] = useState<string | null>(null);
  const [meditationStatus, setMeditationStatus] = useState<string | null>(null);
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://127.0.0.1:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.2:1b");
  const [isStudyGoalNotificationEnabled, setIsStudyGoalNotificationEnabled] = useState(true);
  const [studyGoalReminderTime, setStudyGoalReminderTime] = useState("08:00");
  const [isTestingOllama, setIsTestingOllama] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<string | null>(null);
  const [ocrDependencies, setOcrDependencies] = useState<OcrDependencies | null>(null);
  const [isLoadingOcrDependencies, setIsLoadingOcrDependencies] = useState(true);

  const activeCard = cards[activeCardIndex] ?? null;
  const activeDocumentLanguage = document ? inferDocumentLanguage(document) : null;
  const activeOperationMessage =
    operationStatus === "translatingDocument" && translationOperationPage
      ? t("library.translationPageProgress", {
          currentPage: translationOperationPage.currentPage,
          totalPages: translationOperationPage.totalPages
        })
      : operationStatus === "generatingCardsWithOllama" && cardGenerationProgress
      ? [
          `${t(`library.${operationStatus}`)} ${t("library.cardGenerationProgress", {
            current: cardGenerationProgress.current,
            total: cardGenerationProgress.total
          })}`,
          cardGenerationQueueProgress
            ? t("library.cardGenerationQueueProgress", {
                completed: cardGenerationQueueProgress.completed,
                failed: cardGenerationQueueProgress.failed,
                pending: cardGenerationQueueProgress.pending
              })
            : null
        ]
          .filter(Boolean)
          .join(" ")
      : operationStatus
        ? t(`library.${operationStatus}`)
        : null;
  const cardGenerationQueueProcessed = cardGenerationQueueProgress
    ? cardGenerationQueueProgress.completed + cardGenerationQueueProgress.failed
    : 0;
  const cardGenerationQueuePercent =
    cardGenerationQueueProgress && cardGenerationQueueProgress.total > 0
      ? Math.round((cardGenerationQueueProcessed / cardGenerationQueueProgress.total) * 100)
      : 0;
  const isCardGenerationOperation = operationStatus === "generatingCardsWithOllama";
  const shouldShowBlockingOverlay = Boolean(activeOperationMessage) && !isCardGenerationOperation;
  const shouldShowBackgroundGenerationPanel =
    Boolean(activeOperationMessage) && isCardGenerationOperation;
  const cardGenerationQueuePanel =
    isCardGenerationOperation && cardGenerationQueueProgress ? (
      <section className="processing-queue" aria-label={t("library.cardGenerationQueueTitle")}>
        <div
          className="processing-queue-bar"
          role="progressbar"
          aria-label={t("library.cardGenerationQueueProgressLabel")}
          aria-valuemin={0}
          aria-valuemax={cardGenerationQueueProgress.total}
          aria-valuenow={cardGenerationQueueProcessed}
        >
          <span style={{ width: `${cardGenerationQueuePercent}%` }} />
        </div>
        <dl>
          <div>
            <dt>{t("library.cardGenerationQueueCompleted")}</dt>
            <dd>{cardGenerationQueueProgress.completed}</dd>
          </div>
          <div>
            <dt>{t("library.cardGenerationQueueFailed")}</dt>
            <dd>{cardGenerationQueueProgress.failed}</dd>
          </div>
          <div>
            <dt>{t("library.cardGenerationQueuePending")}</dt>
            <dd>{cardGenerationQueueProgress.pending}</dd>
          </div>
        </dl>
      </section>
    ) : null;
  const filteredSavedDocuments = filterSavedDocuments(
    savedDocuments,
    sourceTypeFilter,
    reviewStatusFilter,
    librarySearchQuery,
    librarySortMode,
    documentReviewCounts,
    documentStudyMetadataById,
    selectedCategoryFilter,
    selectedSubcategoryFilter
  );
  const hasSelectedLibraryCategory = selectedCategoryFilter.trim().length > 0;
  const navigatedSavedDocuments = hasSelectedLibraryCategory ? filteredSavedDocuments : [];
  const visibleDocumentIds = new Set(
    navigatedSavedDocuments.map((savedDocument) => savedDocument.document_id)
  );
  const visibleDocumentProgressSummaries = documentProgressSummaries.filter((summary) =>
    visibleDocumentIds.has(summary.documentId)
  );
  const categoryOptions = uniqueSortedValues([
    ...categoryOptionsFromMetadata(documentStudyMetadataById, studyCategories),
    studyCategoryDefault.category,
    defaultCategoryDraft,
    importCategory
  ]);
  const activeStudyCategories = studyCategories.filter((category) => !category.archived);
  const archivedStudyCategories = studyCategories.filter((category) => category.archived);
  const subcategoryOptions = subcategoryOptionsFromMetadata(
    documentStudyMetadataById,
    selectedCategoryFilter,
    studyCategories
  );
  const defaultSubcategoryOptions = uniqueSortedValues([
    ...subcategoryOptionsFromMetadata(
      documentStudyMetadataById,
      defaultCategoryDraft,
      studyCategories
    ),
    studyCategoryDefault.subcategory,
    defaultSubcategoryDraft
  ]);
  const importSubcategoryOptions = uniqueSortedValues(
    [
      ...subcategoryOptionsFromMetadata(documentStudyMetadataById, importCategory, studyCategories),
      importSubcategory
    ]
  );
  const selectedCategoryLabel = selectedCategoryFilter.trim()
    ? getAcademicCategoryDisplayName(selectedCategoryFilter, t)
    : "";
  const selectedSubcategoryLabel = selectedSubcategoryFilter.trim()
    ? getAcademicSubcategoryDisplayName(selectedSubcategoryFilter, t)
    : "";
  const breadcrumbItems = [
    t("layout.library"),
    selectedCategoryLabel,
    selectedSubcategoryLabel,
    document ? getDocumentTitle(document) : ""
  ].filter((item) => item.length > 0);
  const activeReviewSchedule = activeCard ? cardReviewSchedules[activeCard.id] ?? null : null;
  const isWorkspaceBusy = isImporting || operationStatus !== null;
  const isStudyCategorySaveDisabled =
    isSavingStudyCategory ||
    categoryManagerNameDraft.trim().length === 0 ||
    parseSubcategoryDraft(categoryManagerSubcategoriesDraft).length === 0;
  const isStudyCategoryDefaultSaveDisabled =
    isSavingStudyCategoryDefault ||
    defaultCategoryDraft.trim().length === 0 ||
    defaultSubcategoryDraft.trim().length === 0;
  const isLibraryView = currentView === "library";
  const isTranslatingDocument = operationStatus === "translatingDocument";
  const isCardGenerationBusy =
    operationStatus === "chunkingDocument" ||
    operationStatus === "generatingCardsWithOllama" ||
    operationStatus === "savingStudyCards";
  const generatedCardChunkIds = new Set(cards.map((card) => card.chunkId));
  const canGenerateMoreCards =
    Boolean(document) &&
    chunkCount !== null &&
    cards.length > 0 &&
    generatedCardChunkIds.size < chunkCount;
  const dueStudyQueue = buildDueStudyQueue(
    cards,
    cardReviewSchedules,
    Math.floor(Date.now() / 1000)
  );
  const retentionMetrics = buildRetentionMetrics(cards, reviewHistory);
  const filteredMetricSessionSummaries = filterStudySummariesByMetricPeriod(
    studySessionSummaries,
    metricPeriodFilter
  );
  const studyMetricPeriodSummary = buildStudyMetricPeriodSummary(filteredMetricSessionSummaries);
  const sessionTrend = buildSessionTrend(filteredMetricSessionSummaries);
  const hardCardPeriodTrend = buildHardCardPeriodTrend(filteredMetricSessionSummaries);
  const activeStudyReviewGoal = document
    ? studyReviewGoalsByDocumentId[document.document_id]
    : undefined;
  const activeStudyReviewGoalInput = document
    ? studyReviewGoalInputsByDocumentId[document.document_id] ??
      activeStudyReviewGoal?.toString() ??
      ""
    : "";
  const activeStudyReviewGoalRecurrence = document
    ? studyReviewGoalRecurrencesByDocumentId[document.document_id] ?? "all"
    : "all";
  const activeStudyGoalProgress = buildStudyGoalProgress(
    studySessionSummaries,
    activeStudyReviewGoal,
    activeStudyReviewGoalRecurrence
  );
  const activeStudyGoalAlertKey =
    activeStudyGoalProgress && activeStudyGoalProgress.remainingReviews > 0
      ? studyGoalAlertKey(activeStudyReviewGoalRecurrence)
      : null;
  const reviewCounts = Object.values(cardReviews).reduce(
    (counts, review) => ({
      ...counts,
      [review]: counts[review] + 1
    }),
    { again: 0, hard: 0, easy: 0 } satisfies Record<CardReview, number>
  );

  function startCancellableOperation() {
    operationAbortControllerRef.current?.abort();
    operationAbortControllerRef.current = new AbortController();
    operationTokenRef.current += 1;

    return operationTokenRef.current;
  }

  function isCurrentOperation(operationToken: number) {
    return operationTokenRef.current === operationToken;
  }

  function invalidateTranslationLoad() {
    translationLoadTokenRef.current += 1;
  }

  function nextTranslationLoadToken() {
    invalidateTranslationLoad();

    return translationLoadTokenRef.current;
  }

  function isCurrentTranslationLoad(translationLoadToken: number) {
    return translationLoadTokenRef.current === translationLoadToken;
  }

  function nextTranslatedPageIndexesLoadToken() {
    translatedPageIndexesLoadTokenRef.current += 1;

    return translatedPageIndexesLoadTokenRef.current;
  }

  function isCurrentTranslatedPageIndexesLoad(translatedPageIndexesLoadToken: number) {
    return translatedPageIndexesLoadTokenRef.current === translatedPageIndexesLoadToken;
  }

  function rememberTranslatedReaderPageIndex(pageIndex: number) {
    setTranslatedReaderPageIndexes((currentIndexes) =>
      normalizePageIndexes([...currentIndexes, pageIndex])
    );
  }

  function rememberTranslationErrorReaderPageIndex(pageIndex: number) {
    setTranslationErrorReaderPageIndexes((currentIndexes) =>
      normalizePageIndexes([...currentIndexes, pageIndex])
    );
  }

  function forgetTranslationErrorReaderPageIndex(pageIndex: number) {
    setTranslationErrorReaderPageIndexes((currentIndexes) =>
      currentIndexes.filter((currentIndex) => currentIndex !== pageIndex)
    );
  }

  function forgetTranslatedReaderPageProvider(pageIndex: number) {
    setTranslatedDocumentPageProviders((currentProviders) => {
      const nextProviders = { ...currentProviders };
      delete nextProviders[pageIndex];

      return nextProviders;
    });
  }

  function handleCancelOperation() {
    operationAbortControllerRef.current?.abort();
    operationAbortControllerRef.current = null;
    operationTokenRef.current += 1;
    setIsImporting(false);
    setOperationStatus(null);
    setTranslationOperationPage(null);
    setCardGenerationProgress(null);
    setCardGenerationQueueProgress(null);
    setWarning(t("library.operationCanceled"));
  }

  async function generateCardsWithFallback(
    chunks: ImportedDocumentChunk[],
    operationToken: number,
    options: Pick<GenerateStudyCardsOptions, "onChunkCards"> = {}
  ): Promise<StudyCard[]> {
    const chunksForGeneration = chunks.slice(0, INITIAL_CARD_GENERATION_CHUNK_LIMIT);
    let skippedChunkCount = 0;
    setCardGenerationProgress(null);
    setCardGenerationQueueProgress(null);

    if (chunks.length > INITIAL_CARD_GENERATION_CHUNK_LIMIT) {
      setWarning(
        t("library.cardGenerationLimited", {
          count: INITIAL_CARD_GENERATION_CHUNK_LIMIT,
          total: chunks.length
        })
      );
    }

    try {
      const generatedCards = await generateCards(chunksForGeneration, {
        onProgress: (progress) => {
          if (isCurrentOperation(operationToken)) {
            setCardGenerationProgress(progress);
          }
        },
        onQueueProgress: (progress) => {
          if (isCurrentOperation(operationToken)) {
            setCardGenerationQueueProgress(progress);
          }
        },
        onChunkCards: options.onChunkCards,
        onChunkError: () => {
          if (isCurrentOperation(operationToken)) {
            skippedChunkCount += 1;
          }
        },
        signal: operationAbortControllerRef.current?.signal
      });

      if (skippedChunkCount > 0 && isCurrentOperation(operationToken)) {
        setWarning(
          t("library.cardGenerationSkippedChunks", {
            count: skippedChunkCount,
            total: chunksForGeneration.length
          })
        );
      }
      return generatedCards;
    } catch (unknownError) {
      if (!enableDevelopmentFallback) {
        throw unknownError;
      }

      const fallbackCards = await generateStudyCards(
        chunksForGeneration,
        { cardsPerChunk: 1, language: "pt" },
        new MockModelAdapter()
      );

      setWarning(t("library.mockGenerationFallback"));
      setCardGenerationProgress(null);
      setCardGenerationQueueProgress(null);
      return fallbackCards;
    }
  }

  async function saveGeneratedChunkCards(
    chunkCards: StudyCard[],
    operationToken: number,
    savedCardIds: Set<string>,
    onSaved: (savedCards: StudyCard[]) => void
  ) {
    if (!isCurrentOperation(operationToken) || chunkCards.length === 0) {
      return;
    }

    const savedChunkCards = await saveStudyCards(chunkCards);

    if (!isCurrentOperation(operationToken)) {
      return;
    }

    savedChunkCards.forEach((card) => {
      savedCardIds.add(card.id);
    });
    onSaved(savedChunkCards);
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
    setDocumentSessionSummariesById((currentSummariesByDocument) => ({
      ...currentSummariesByDocument,
      [documentId]: [
        ...(currentSummariesByDocument[documentId] ?? []),
        {
          session_id: session.id,
          document_id: session.document_id,
          started_at: session.started_at,
          again_count: 0,
          hard_count: 0,
          easy_count: 0
        }
      ]
    }));
    setDocumentProgressSummaries((currentSummaries) =>
      currentSummaries
        .map((summary) =>
          summary.documentId === documentId
            ? { ...summary, sessionCount: summary.sessionCount + 1 }
            : summary
        )
        .sort((firstSummary, secondSummary) => secondSummary.reviewCount - firstSummary.reviewCount)
        .map((summary, index) => ({
          ...summary,
          isTopReviewed: index === 0 && summary.reviewCount > 0
        }))
    );
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadPersistedStudyCategories() {
      try {
        const response = await listStudyCategories({ includeArchived: true });

        if (isCurrent) {
          setStudyCategories(response.categories);
        }
      } catch {
        if (isCurrent) {
          setWarning(t("library.studyCategoriesLoadError"));
        }
      }
    }

    void loadPersistedStudyCategories();

    return () => {
      isCurrent = false;
    };
  }, [listStudyCategories, t]);

  useEffect(() => {
    let isCurrent = true;

    async function loadPersistedStudyCategoryDefault() {
      try {
        const settings = await loadStudyCategoryDefault();

        if (isCurrent) {
          setStudyCategoryDefault(settings);
          setDefaultCategoryDraft(settings.category);
          setDefaultSubcategoryDraft(settings.subcategory);
        }
      } catch {
        if (isCurrent) {
          setWarning(t("library.defaultStudyCategoryLoadError"));
        }
      }
    }

    void loadPersistedStudyCategoryDefault();

    return () => {
      isCurrent = false;
    };
  }, [loadStudyCategoryDefault, t]);

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
        const sessionSummaryEntries = await Promise.all(
          response.documents.map(async (savedDocument) => {
            try {
              const summaries = await listStudySessionSummaries(savedDocument.document_id);
              return [savedDocument.document_id, summaries] as const;
            } catch {
              return [savedDocument.document_id, []] as const;
            }
          })
        );
        const metadataEntries = await Promise.all(
          response.documents.map(async (savedDocument) => {
            try {
              const metadata = await loadDocumentStudyMetadata(savedDocument.document_id);
              return [savedDocument.document_id, metadata] as const;
            } catch {
              return [savedDocument.document_id, null] as const;
            }
          })
        );
        const summariesByDocument = Object.fromEntries(sessionSummaryEntries);
        const metadataByDocument = Object.fromEntries(
          metadataEntries.filter((entry): entry is readonly [string, DocumentStudyMetadata] =>
            Boolean(entry[1])
          )
        );

        if (isCurrent) {
          setSavedDocuments(response.documents);
          setDocumentReviewCounts(Object.fromEntries(reviewCountEntries));
          setDocumentSessionSummariesById(summariesByDocument);
          setDocumentStudyMetadataById(metadataByDocument);
          setDocumentProgressSummaries(
            buildDocumentProgressSummaries(response.documents, summariesByDocument)
          );
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
  }, [
    listImportedDocuments,
    listStudyReviews,
    listStudySessionSummaries,
    loadDocumentStudyMetadata,
    t
  ]);

  useEffect(() => {
    const loadToken = documentStudyMetadataLoadTokenRef.current + 1;
    documentStudyMetadataLoadTokenRef.current = loadToken;
    setDocumentStudyMetadata(null);
    setCategoryDraft("");
    setSubcategoryDraft("");
    setCategoryDescriptionDraft("");
    setDocumentStudyMetadataStatus(null);

    if (!document) {
      setIsLoadingDocumentStudyMetadata(false);
      return;
    }

    const documentId = document.document_id;

    async function loadActiveDocumentStudyMetadata() {
      setIsLoadingDocumentStudyMetadata(true);

      try {
        const metadata = await loadDocumentStudyMetadata(documentId);

        if (documentStudyMetadataLoadTokenRef.current !== loadToken) {
          return;
        }

        setDocumentStudyMetadata(metadata);
        setCategoryDraft(metadata?.category ?? "");
        setSubcategoryDraft(metadata?.subcategory ?? "");
        setCategoryDescriptionDraft(metadata?.description ?? "");
        setDocumentStudyMetadataById((currentMetadataById) => {
          if (!metadata) {
            const nextMetadataById = { ...currentMetadataById };
            delete nextMetadataById[documentId];
            return nextMetadataById;
          }

          return {
            ...currentMetadataById,
            [documentId]: metadata
          };
        });
      } catch {
        if (documentStudyMetadataLoadTokenRef.current === loadToken) {
          setError(t("study.categoryMetadataLoadError"));
        }
      } finally {
        if (documentStudyMetadataLoadTokenRef.current === loadToken) {
          setIsLoadingDocumentStudyMetadata(false);
        }
      }
    }

    void loadActiveDocumentStudyMetadata();
  }, [document, loadDocumentStudyMetadata, t]);

  useEffect(() => {
    const loadToken = meditationLoadTokenRef.current + 1;
    meditationLoadTokenRef.current = loadToken;
    setMeditationNotes([]);
    setMeditationDraft("");
    setEditingMeditationNoteId(null);
    setIsMeditationPanelOpen(false);
    setIsMeditationEditorOpen(false);
    setDeletingMeditationNoteId(null);
    setMeditationStatus(null);

    if (!document) {
      setIsLoadingMeditationNote(false);
      return;
    }

    const documentId = document.document_id;

    async function loadActiveMeditationNote() {
      setIsLoadingMeditationNote(true);

      try {
        const response = await loadMeditationNotes(documentId);

        if (meditationLoadTokenRef.current !== loadToken) {
          return;
        }

        setMeditationNotes(response.notes);
        setMeditationDraft("");
      } catch {
        if (meditationLoadTokenRef.current === loadToken) {
          setError(t("study.meditationLoadError"));
        }
      } finally {
        if (meditationLoadTokenRef.current === loadToken) {
          setIsLoadingMeditationNote(false);
        }
      }
    }

    void loadActiveMeditationNote();
  }, [document, loadMeditationNotes, t]);

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

  useEffect(() => {
    let isCurrent = true;

    async function loadSettings() {
      try {
        const settings = await loadNotificationSettings();

        if (isCurrent) {
          setIsStudyGoalNotificationEnabled(settings.study_goal_reminders_enabled);
          setStudyGoalReminderTime(settings.study_goal_reminder_time);
        }
      } catch {
        if (isCurrent) {
          setError(t("settings.notificationSettingsLoadError"));
        }
      }
    }

    void loadSettings();

    return () => {
      isCurrent = false;
    };
  }, [loadNotificationSettings, t]);

  useEffect(() => {
    let isCurrent = true;

    async function loadOcrDependencies() {
      setIsLoadingOcrDependencies(true);

      try {
        const dependencies = await testOcrDependencies();

        if (isCurrent) {
          setOcrDependencies(dependencies);
        }
      } catch {
        if (isCurrent) {
          setError(t("settings.ocrDependencyLoadError"));
        }
      } finally {
        if (isCurrent) {
          setIsLoadingOcrDependencies(false);
        }
      }
    }

    void loadOcrDependencies();

    return () => {
      isCurrent = false;
    };
  }, [testOcrDependencies, t]);

  useEffect(() => {
    pdfReaderPreferenceTokenRef.current += 1;
    const preferenceToken = pdfReaderPreferenceTokenRef.current;

    setPdfReaderPage(1);
    setPdfReaderZoom(1);
    setReaderPage(1);
    setRenderedPdfPage(null);
    setIsReaderPreferenceLoaded(false);

    if (!document) {
      setIsReaderPreferenceLoaded(true);
      return;
    }

    loadPdfReaderPreference(document.document_id)
      .then((preference) => {
        if (pdfReaderPreferenceTokenRef.current !== preferenceToken) {
          return;
        }

        setPdfReaderPage(document.source_type === "pdf" ? preference.page : 1);
        setPdfReaderZoom(document.source_type === "pdf" ? preference.zoom : 1);
        setReaderPage(preference.reader_page && preference.reader_page > 0 ? preference.reader_page : 1);
      })
      .catch(() => {
        if (pdfReaderPreferenceTokenRef.current === preferenceToken) {
          setPdfReaderPage(1);
          setPdfReaderZoom(1);
          setReaderPage(1);
        }
      })
      .finally(() => {
        if (pdfReaderPreferenceTokenRef.current === preferenceToken) {
          setIsReaderPreferenceLoaded(true);
        }
      });
  }, [document, loadPdfReaderPreference, t]);

  useEffect(() => {
    if (!document || !isReaderPreferenceLoaded) {
      return;
    }

    savePdfReaderPreference({
      document_id: document.document_id,
      page: document.source_type === "pdf" ? pdfReaderPage : 1,
      zoom: document.source_type === "pdf" ? pdfReaderZoom : 1,
      reader_page: readerPage
    }).catch(() => {
      setError(t("library.pdfReaderPreferenceSaveError"));
    });
  }, [
    document,
    isReaderPreferenceLoaded,
    pdfReaderPage,
    pdfReaderZoom,
    readerPage,
    savePdfReaderPreference,
    t
  ]);

  useEffect(() => {
    if (
      !document ||
      document.source_type !== "pdf" ||
      !document.source_path ||
      !isReaderPreferenceLoaded
    ) {
      setRenderedPdfPage(null);
      setIsRenderingPdfPage(false);
      return;
    }

    let isCurrent = true;
    setIsRenderingPdfPage(true);

    renderPdfPage({
      file_path: document.source_path,
      page: pdfReaderPage,
      dpi: 144
    })
      .then((response) => {
        if (!isCurrent) {
          return;
        }

        setRenderedPdfPage(response);
        if (pdfReaderPage > response.page_count) {
          setPdfReaderPage(response.page_count);
        }
      })
      .catch((unknownError) => {
        if (!isCurrent) {
          return;
        }

        setRenderedPdfPage(null);
        setError(getErrorMessage(unknownError, t("library.pdfRenderError")));
      })
      .finally(() => {
        if (isCurrent) {
          setIsRenderingPdfPage(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [document, isReaderPreferenceLoaded, pdfReaderPage, renderPdfPage, t]);

  async function handleUiLanguageChange(language: UiLanguage) {
    setUiLanguage(language);
    persistUiLanguage(language);
    await i18n.changeLanguage(language);
  }

  async function loadPersistedTranslationForDocument(
    selectedDocument: ImportTextBookResponse,
    targetLanguage: ImportTextBookResponse["language"]
  ) {
    const translationLoadToken = nextTranslationLoadToken();

    const sourceLanguage = inferDocumentLanguage(selectedDocument);

    if (targetLanguage === sourceLanguage) {
      setTranslatedDocumentPages({});
      setTranslatedDocumentPageSources({});
      setTranslatedDocumentPageProviders({});
      setTranslatedReaderPageIndexes([]);
      setTranslationErrorReaderPageIndexes([]);
      return;
    }

    void loadTranslatedReaderPageIndexesForDocument(selectedDocument, targetLanguage);

    try {
      const response = await loadDocumentTranslation(
        selectedDocument.document_id,
        targetLanguage,
        0
      );

      if (!isCurrentTranslationLoad(translationLoadToken)) {
        return;
      }

      const cachedTranslation = hasUsableTranslationContent(response.translation)
        ? response.translation
        : null;

      setTranslatedDocumentPages(
        cachedTranslation ? { 0: cachedTranslation.translated_content } : {}
      );
      setTranslatedDocumentPageSources(cachedTranslation ? { 0: "cache" } : {});
      setTranslatedDocumentPageProviders({});
      if (cachedTranslation) {
        forgetTranslationErrorReaderPageIndex(0);
        rememberTranslatedReaderPageIndex(0);
      }
    } catch {
      if (isCurrentTranslationLoad(translationLoadToken)) {
        setError(t("library.translationLoadError"));
      }
    }
  }

  async function loadTranslatedReaderPageIndexesForDocument(
    selectedDocument: ImportTextBookResponse,
    targetLanguage: ImportTextBookResponse["language"]
  ) {
    const translatedPageIndexesLoadToken = nextTranslatedPageIndexesLoadToken();
    const sourceLanguage = inferDocumentLanguage(selectedDocument);

    if (targetLanguage === sourceLanguage) {
      setTranslatedReaderPageIndexes([]);
      setTranslationErrorReaderPageIndexes([]);
      return;
    }

    try {
      const response = await listDocumentPageTranslations(
        selectedDocument.document_id,
        targetLanguage
      );

      if (!isCurrentTranslatedPageIndexesLoad(translatedPageIndexesLoadToken)) {
        return;
      }

      setTranslatedReaderPageIndexes(normalizePageIndexes(response.page_indexes));
    } catch {
      if (isCurrentTranslatedPageIndexesLoad(translatedPageIndexesLoadToken)) {
        setTranslatedReaderPageIndexes([]);
        setTranslationErrorReaderPageIndexes([]);
      }
    }
  }

  function handleReaderTargetLanguageChange(language: ImportTextBookResponse["language"]) {
    setReaderTargetLanguage(language);
    setTranslatedDocumentPages({});
    setTranslatedDocumentPageSources({});
    setTranslatedDocumentPageProviders({});
    setTranslatedReaderPageIndexes([]);
    setTranslationErrorReaderPageIndexes([]);

    if (document) {
      void loadPersistedTranslationForDocument(document, language);
    }
  }

  async function handleLoadCachedReaderPage({ pageIndex }: ReaderPageTranslationRequest) {
    if (!document) {
      return;
    }

    const sourceLanguage = inferDocumentLanguage(document);

    if (readerTargetLanguage === sourceLanguage || translatedDocumentPages[pageIndex]) {
      return;
    }

    const translationLoadToken = nextTranslationLoadToken();

    try {
      const response = await loadDocumentTranslation(
        document.document_id,
        readerTargetLanguage,
        pageIndex
      );

      const cachedTranslation = hasUsableTranslationContent(response.translation)
        ? response.translation
        : null;

      if (!isCurrentTranslationLoad(translationLoadToken) || !cachedTranslation) {
        return;
      }

      setTranslatedDocumentPages((currentPages) => ({
        ...currentPages,
        [pageIndex]: cachedTranslation.translated_content
      }));
      setTranslatedDocumentPageSources((currentSources) => ({
        ...currentSources,
        [pageIndex]: "cache"
      }));
      forgetTranslatedReaderPageProvider(pageIndex);
      forgetTranslationErrorReaderPageIndex(pageIndex);
      rememberTranslatedReaderPageIndex(pageIndex);
    } catch {
      if (isCurrentTranslationLoad(translationLoadToken)) {
        setError(t("library.translationLoadError"));
      }
    }
  }

  function handleReaderPageChange(request: ReaderPageTranslationRequest) {
    setReaderPage(request.pageIndex + 1);
    void handleLoadCachedReaderPage(request);
  }

  async function handleTranslateActiveDocument({
    pageIndex,
    pageContent,
    totalPages = pageIndex + 1,
    forceRefresh = false
  }: ReaderPageTranslationRequest) {
    if (!document) {
      return;
    }

    invalidateTranslationLoad();

    const sourceLanguage = inferDocumentLanguage(document);

    if (readerTargetLanguage === sourceLanguage) {
      setTranslatedDocumentPages({});
      setTranslatedDocumentPageSources({});
      setTranslatedDocumentPageProviders({});
      setTranslatedReaderPageIndexes([]);
      setTranslationErrorReaderPageIndexes([]);
      setTranslationOperationPage(null);
      return;
    }

    if (translatedDocumentPages[pageIndex] && !forceRefresh) {
      return;
    }

    setError(null);
    setWarning(null);
    setOperationStatus("translatingDocument");
    setTranslationOperationPage({
      currentPage: pageIndex + 1,
      totalPages: Math.max(totalPages, pageIndex + 1)
    });
    const operationToken = startCancellableOperation();

    try {
      await waitForUiPaint();
      if (!isCurrentOperation(operationToken)) {
        return;
      }

      if (!forceRefresh) {
        const cachedTranslation = await loadDocumentTranslation(
          document.document_id,
          readerTargetLanguage,
          pageIndex
        );
        if (!isCurrentOperation(operationToken)) {
          return;
        }

        const cachedPageTranslation = hasUsableTranslationContent(cachedTranslation.translation)
          ? cachedTranslation.translation
          : null;

        if (cachedPageTranslation) {
          setTranslatedDocumentPages((currentPages) => ({
            ...currentPages,
            [pageIndex]: cachedPageTranslation.translated_content
          }));
          setTranslatedDocumentPageSources((currentSources) => ({
            ...currentSources,
            [pageIndex]: "cache"
          }));
          forgetTranslatedReaderPageProvider(pageIndex);
          forgetTranslationErrorReaderPageIndex(pageIndex);
          rememberTranslatedReaderPageIndex(pageIndex);
          return;
        }
      }

      const response = await translateDocument({
        document_id: document.document_id,
        content: pageContent,
        source_language: sourceLanguage,
        target_language: readerTargetLanguage,
        page_index: pageIndex
      });
      if (!isCurrentOperation(operationToken)) {
        return;
      }

      setTranslatedDocumentPages((currentPages) => ({
        ...currentPages,
        [pageIndex]: response.translated_content
      }));
      setTranslatedDocumentPageSources((currentSources) => ({
        ...currentSources,
        [pageIndex]: "generated"
      }));
      setTranslatedDocumentPageProviders((currentProviders) => ({
        ...currentProviders,
        [pageIndex]: response.translation_provider
      }));
      forgetTranslationErrorReaderPageIndex(pageIndex);
      rememberTranslatedReaderPageIndex(pageIndex);
    } catch (unknownError) {
      if (!isCurrentOperation(operationToken)) {
        return;
      }

      rememberTranslationErrorReaderPageIndex(pageIndex);
      setError(getErrorMessage(unknownError, t("library.translationError")));
    } finally {
      if (isCurrentOperation(operationToken)) {
        setOperationStatus(null);
        setTranslationOperationPage(null);
        operationAbortControllerRef.current = null;
      }
    }
  }

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
    setDocumentChunks([]);
    setCards([]);
    invalidateTranslationLoad();
    setReaderTargetLanguage("En");
    setTranslatedDocumentPages({});
    setTranslatedDocumentPageSources({});
    setTranslatedDocumentPageProviders({});
    setTranslatedReaderPageIndexes([]);
    setTranslationErrorReaderPageIndexes([]);
    setActiveCardIndex(0);
    setIsAnswerVisible(false);
    setCardReviews({});
    setReviewHistory([]);
    setActiveStudySession(null);
    setStudySessionReviewCount(0);
    setStudySessionSummaries([]);
    setPrintableReportPreviewHtml(null);
    setCardReviewSchedules({});
    setCardGenerationProgress(null);
    setCardGenerationQueueProgress(null);
    const operationToken = startCancellableOperation();

    try {
      await waitForUiPaint();
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      const currentImportedDocument = await importTextBook(trimmedPath, {
        ocrEnabled: isOcrEnabled,
        ocrLanguage
      });
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      setOperationStatus("chunkingDocument");
      const chunkResponse = await chunkTextDocument(toChunkRequest(currentImportedDocument, 180));
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      const currentImportCategory = importCategory.trim() || DEFAULT_STUDY_CATEGORY;
      const currentImportSubcategory =
        importSubcategory.trim() ||
        getDefaultSubcategoryForCategory(currentImportCategory, studyCategories);
      const importedMetadata = await saveDocumentStudyMetadata(
        currentImportedDocument.document_id,
        currentImportCategory,
        currentImportSubcategory,
        importCategoryDescriptionDraft.trim() ||
        t("library.importedCategoryDescription", {
            category: getAcademicCategoryDisplayName(currentImportCategory, t),
            subcategory: getAcademicSubcategoryDisplayName(currentImportSubcategory, t)
          })
      );
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      setDocument(currentImportedDocument);
      setDocumentStudyMetadata(importedMetadata);
      setCategoryDraft(importedMetadata?.category ?? "");
      setSubcategoryDraft(importedMetadata?.subcategory ?? "");
      setCategoryDescriptionDraft(importedMetadata?.description ?? "");
      invalidateTranslationLoad();
      setReaderTargetLanguage(
        defaultReaderTargetLanguage(inferDocumentLanguage(currentImportedDocument))
      );
      setTranslatedDocumentPages({});
      setTranslatedDocumentPageSources({});
      setTranslatedDocumentPageProviders({});
      setTranslatedReaderPageIndexes([]);
      setTranslationErrorReaderPageIndexes([]);
      setDocumentChunks(chunkResponse.chunks);
      setSavedDocuments((currentDocuments) => [...currentDocuments, currentImportedDocument]);
      setDocumentStudyMetadataById((currentMetadataById) => ({
        ...currentMetadataById,
        [currentImportedDocument.document_id]: importedMetadata
      }));
      setSelectedCategoryFilter(currentImportCategory);
      setSelectedSubcategoryFilter(currentImportSubcategory);
      setIsImportDialogOpen(false);
      setCurrentView("study");
      setDocumentReviewCounts((currentCounts) => ({
        ...currentCounts,
        [currentImportedDocument.document_id]: 0
      }));
      setDocumentSessionSummariesById((currentSummariesByDocument) => ({
        ...currentSummariesByDocument,
        [currentImportedDocument.document_id]: []
      }));
      setDocumentProgressSummaries(
        buildDocumentProgressSummaries([...savedDocuments, currentImportedDocument], {
          ...documentSessionSummariesById,
          [currentImportedDocument.document_id]: []
        })
      );
      setChunkCount(chunkResponse.chunks.length);
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
      setCardReviews({});
      setReviewHistory([]);
      setStudySessionSummaries([]);
      setCardReviewSchedules({});
    } catch (unknownError) {
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      setDocument(null);
      setChunkCount(null);
      setDocumentChunks([]);
      setCards([]);
      invalidateTranslationLoad();
      setReaderTargetLanguage("En");
      setTranslatedDocumentPages({});
      setTranslatedDocumentPageSources({});
      setTranslatedDocumentPageProviders({});
      setTranslatedReaderPageIndexes([]);
      setTranslationErrorReaderPageIndexes([]);
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
      setCardReviews({});
      setReviewHistory([]);
      setActiveStudySession(null);
      setStudySessionReviewCount(0);
      setStudySessionSummaries([]);
      setCardReviewSchedules({});
      setWarning(null);
      setError(getErrorMessage(unknownError, t("library.unknownError")));
    } finally {
      if (isCurrentOperation(operationToken)) {
        setIsImporting(false);
        setOperationStatus(null);
        setCardGenerationProgress(null);
        setCardGenerationQueueProgress(null);
        operationAbortControllerRef.current = null;
      }
    }
  }

  async function handleSelectSavedDocument(selectedDocument: ImportTextBookResponse) {
    const targetLanguage = defaultReaderTargetLanguage(inferDocumentLanguage(selectedDocument));

    setCurrentView("study");
    setDocument(selectedDocument);
    setReaderTargetLanguage(targetLanguage);
    setTranslatedDocumentPages({});
    setTranslatedDocumentPageSources({});
    setTranslatedDocumentPageProviders({});
    setTranslatedReaderPageIndexes([]);
    setTranslationErrorReaderPageIndexes([]);
    void loadPersistedTranslationForDocument(selectedDocument, targetLanguage);
    setChunkCount(null);
    setDocumentChunks([]);
    setCards([]);
    setActiveCardIndex(0);
    setIsAnswerVisible(false);
    setCardReviews({});
    setReviewHistory([]);
    setActiveStudySession(null);
    setStudySessionReviewCount(0);
    setStudySessionSummaries([]);
    setCardReviewSchedules({});
    setCardGenerationProgress(null);
    setCardGenerationQueueProgress(null);
    setError(null);
    setWarning(null);
    setOperationStatus("loadingSavedCards");
    const operationToken = startCancellableOperation();

    try {
      const persistedStudyGoal = await loadStudyGoal(selectedDocument.document_id);
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      if (persistedStudyGoal) {
        setStudyReviewGoalsByDocumentId((currentGoals) => ({
          ...currentGoals,
          [selectedDocument.document_id]: persistedStudyGoal.target_reviews
        }));
        setStudyReviewGoalInputsByDocumentId((currentInputs) => ({
          ...currentInputs,
          [selectedDocument.document_id]: persistedStudyGoal.target_reviews.toString()
        }));
        setStudyReviewGoalRecurrencesByDocumentId((currentRecurrences) => ({
          ...currentRecurrences,
          [selectedDocument.document_id]: persistedStudyGoal.recurrence
        }));
      }

      const persistedCards = await listStudyCards(selectedDocument.document_id);
      if (!isCurrentOperation(operationToken)) {
        return;
      }

      if (persistedCards.length > 0) {
        const persistedReviews = await listStudyReviews(selectedDocument.document_id);
        if (!isCurrentOperation(operationToken)) {
          return;
        }
        const persistedSessionSummaries = await listStudySessionSummaries(
          selectedDocument.document_id
        );
        if (!isCurrentOperation(operationToken)) {
          return;
        }
        const fallbackChunkCount = new Set(persistedCards.map((card) => card.chunkId)).size;
        let persistedChunks: ImportedDocumentChunk[] = [];
        try {
          const chunkResponse = await listDocumentChunks(selectedDocument.document_id);
          if (!isCurrentOperation(operationToken)) {
            return;
          }
          persistedChunks = chunkResponse.chunks;
        } catch {
          persistedChunks = [];
        }
        setDocumentChunks(persistedChunks);
        setChunkCount(persistedChunks.length > 0 ? persistedChunks.length : fallbackChunkCount);
        setCards(persistedCards);
        setActiveCardIndex(0);
        setIsAnswerVisible(false);
        setCardReviews(toCardReviewMap(persistedReviews));
        setReviewHistory(persistedReviews);
        setStudySessionSummaries(persistedSessionSummaries);
        await beginStudySession(selectedDocument.document_id);
        if (!isCurrentOperation(operationToken)) {
          return;
        }
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
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      setDocumentChunks(chunkResponse.chunks);
      setChunkCount(chunkResponse.chunks.length);
      setCards([]);
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
      setCardReviews({});
      setReviewHistory([]);
      setStudySessionSummaries([]);
      setCardReviewSchedules({});
      setOperationStatus(null);
    } catch (unknownError) {
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      setChunkCount(null);
      setDocumentChunks([]);
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
      setError(getErrorMessage(unknownError, t("library.unknownError")));
    } finally {
      if (isCurrentOperation(operationToken)) {
        setOperationStatus(null);
        setCardGenerationProgress(null);
        setCardGenerationQueueProgress(null);
        operationAbortControllerRef.current = null;
      }
    }
  }

  function handleSelectBookFromPanel(selectedDocument: ImportTextBookResponse) {
    setIsBooksPanelOpen(false);
    void handleSelectSavedDocument(selectedDocument);
    window.setTimeout(() => {
      if (typeof activeStudyPanelRef.current?.scrollIntoView === "function") {
        activeStudyPanelRef.current.scrollIntoView({ block: "start" });
      }
    }, 0);
  }

  function openImportDialog() {
    const category =
      selectedCategoryFilter.trim() || studyCategoryDefault.category || DEFAULT_STUDY_CATEGORY;
    const subcategory =
      selectedSubcategoryFilter.trim() ||
      (category === studyCategoryDefault.category ? studyCategoryDefault.subcategory : "") ||
      getDefaultSubcategoryForCategory(category, studyCategories);

    setImportCategory(category);
    setImportSubcategory(subcategory);
    setIsImportDialogOpen(true);
  }

  function handleLibraryCategoryChange(category: string) {
    setSelectedCategoryFilter(category);
    setSelectedSubcategoryFilter("");
  }

  function handleImportCategoryChange(category: string) {
    const nextCategory = category || DEFAULT_STUDY_CATEGORY;

    setImportCategory(nextCategory);
    setImportSubcategory(getDefaultSubcategoryForCategory(nextCategory, studyCategories));
  }

  function handleDefaultStudyCategoryChange(category: string) {
    const nextCategory = category || DEFAULT_STUDY_CATEGORY;

    setDefaultCategoryDraft(nextCategory);
    setDefaultSubcategoryDraft(getDefaultSubcategoryForCategory(nextCategory, studyCategories));
    setCategoryManagerStatus(null);
  }

  function resetStudyCategoryManagerDraft() {
    setCategoryManagerDraftId(null);
    setCategoryManagerNameDraft("");
    setCategoryManagerSubcategoriesDraft("");
    setCategoryManagerStatus(null);
  }

  function handleEditStudyCategory(category: StudyCategory) {
    setCategoryManagerDraftId(category.id);
    setCategoryManagerNameDraft(category.name);
    setCategoryManagerSubcategoriesDraft(category.subcategories.join(", "));
    setCategoryManagerStatus(null);
  }

  async function handleSaveStudyCategory() {
    setIsSavingStudyCategory(true);
    setCategoryManagerStatus(null);
    setError(null);

    try {
      const isEditingStudyCategory = categoryManagerDraftId !== null;
      const savedCategory = await saveStudyCategory({
        id: categoryManagerDraftId,
        name: categoryManagerNameDraft,
        subcategories: parseSubcategoryDraft(categoryManagerSubcategoriesDraft)
      });

      setStudyCategories((currentCategories) => [
        ...currentCategories.filter((category) => category.id !== savedCategory.id),
        savedCategory
      ]);
      resetStudyCategoryManagerDraft();
      setCategoryManagerStatus(
        isEditingStudyCategory
          ? t("library.studyCategoryUpdated")
          : t("library.studyCategorySaved")
      );
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("library.studyCategorySaveError")));
    } finally {
      setIsSavingStudyCategory(false);
    }
  }

  async function handleSaveStudyCategoryDefault() {
    setIsSavingStudyCategoryDefault(true);
    setCategoryManagerStatus(null);
    setError(null);

    try {
      const savedSettings = await saveStudyCategoryDefault({
        category: defaultCategoryDraft,
        subcategory: defaultSubcategoryDraft
      });

      setStudyCategoryDefault(savedSettings);
      setDefaultCategoryDraft(savedSettings.category);
      setDefaultSubcategoryDraft(savedSettings.subcategory);
      setCategoryManagerStatus(t("library.defaultStudyCategorySaved"));
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("library.defaultStudyCategorySaveError")));
    } finally {
      setIsSavingStudyCategoryDefault(false);
    }
  }

  async function handleArchiveStudyCategory(category: StudyCategory) {
    setError(null);

    try {
      const archivedCategory = await archiveStudyCategory(category.id);
      setStudyCategories((currentCategories) =>
        currentCategories.map((currentCategory) =>
          currentCategory.id === archivedCategory.id ? archivedCategory : currentCategory
        )
      );
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("library.studyCategoryArchiveError")));
    }
  }

  async function handleRestoreStudyCategory(category: StudyCategory) {
    setError(null);

    try {
      const restoredCategory = await restoreStudyCategory(category.id);
      setStudyCategories((currentCategories) =>
        currentCategories.map((currentCategory) =>
          currentCategory.id === restoredCategory.id ? restoredCategory : currentCategory
        )
      );
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("library.studyCategoryRestoreError")));
    }
  }

  async function handleDeleteStudyCategory(category: StudyCategory) {
    if (!confirmDelete(t("library.deleteStudyCategoryConfirmation"))) {
      return;
    }

    setError(null);

    try {
      const deletedCategory = await deleteStudyCategory(category.id);
      setStudyCategories((currentCategories) =>
        currentCategories.filter((currentCategory) => currentCategory.id !== deletedCategory.id)
      );
      if (categoryManagerDraftId === deletedCategory.id) {
        resetStudyCategoryManagerDraft();
      }
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("library.studyCategoryDeleteError")));
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
      setError(getErrorMessage(unknownError, t("settings.ollamaConnectionError")));
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

  async function handleGenerateCardsForActiveDocument() {
    if (!document) {
      return;
    }

    setError(null);
    setWarning(null);
    setOperationStatus("chunkingDocument");
    setCardGenerationProgress(null);
    setCardGenerationQueueProgress(null);
    const operationToken = startCancellableOperation();
    const partiallySavedCards: StudyCard[] = [];
    const incrementallySavedCardIds = new Set<string>();
    let generatedChunkCount: number | null = null;
    let chunksForGeneration = documentChunks;

    try {
      await waitForUiPaint();
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      let chunkResponse = { chunks: chunksForGeneration };
      if (chunkResponse.chunks.length === 0) {
        chunkResponse = await listDocumentChunks(document.document_id);
        if (!isCurrentOperation(operationToken)) {
          return;
        }
      }
      if (chunkResponse.chunks.length === 0) {
        chunkResponse = await chunkTextDocument(toChunkRequest(document, 180));
        if (!isCurrentOperation(operationToken)) {
          return;
        }
      }
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      chunksForGeneration = chunkResponse.chunks;
      setDocumentChunks(chunkResponse.chunks);
      generatedChunkCount = chunkResponse.chunks.length;
      setOperationStatus("generatingCardsWithOllama");
      await waitForUiPaint();
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      const generatedCards = await generateCardsWithFallback(chunkResponse.chunks, operationToken, {
        onChunkCards: async (chunkCards) => {
          await saveGeneratedChunkCards(
            chunkCards,
            operationToken,
            incrementallySavedCardIds,
            (savedChunkCards) => {
              partiallySavedCards.push(...savedChunkCards);
              setCards((currentCards) => [...currentCards, ...savedChunkCards]);

              if (savedChunkCards.length > 0) {
                setActiveCardIndex(0);
                setIsAnswerVisible(false);
              }
            }
          );
        }
      });
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      setOperationStatus("savingStudyCards");
      setCardGenerationProgress(null);
      setCardGenerationQueueProgress(null);
      const unsavedGeneratedCards = generatedCards.filter(
        (generatedCard) => !incrementallySavedCardIds.has(generatedCard.id)
      );
      const savedCards =
        unsavedGeneratedCards.length > 0 ? await saveStudyCards(unsavedGeneratedCards) : [];
      if (!isCurrentOperation(operationToken)) {
        return;
      }

      setChunkCount(chunkResponse.chunks.length);
      setCards([...partiallySavedCards, ...savedCards]);
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
      setCardReviews({});
      setReviewHistory([]);
      setStudySessionSummaries([]);
      await beginStudySession(document.document_id);
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      setCardReviewSchedules({});
    } catch (unknownError) {
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      if (partiallySavedCards.length > 0) {
        setChunkCount(generatedChunkCount);
        setDocumentChunks(chunksForGeneration);
        setCards(partiallySavedCards);
      } else {
        setChunkCount(null);
        setDocumentChunks([]);
        setCards([]);
      }
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
      setCardReviews({});
      setReviewHistory([]);
      setActiveStudySession(null);
      setStudySessionReviewCount(0);
      setStudySessionSummaries([]);
      setCardReviewSchedules({});
      if (partiallySavedCards.length > 0) {
        setWarning(t("library.partialCardsSaved", { count: partiallySavedCards.length }));
      } else {
        setError(getErrorMessage(unknownError, t("library.unknownError")));
      }
    } finally {
      if (isCurrentOperation(operationToken)) {
        setOperationStatus(null);
        setCardGenerationProgress(null);
        setCardGenerationQueueProgress(null);
        operationAbortControllerRef.current = null;
      }
    }
  }

  async function handleGenerateMoreCardsForActiveDocument() {
    if (!document) {
      return;
    }

    setError(null);
    setWarning(null);
    setOperationStatus("chunkingDocument");
    setCardGenerationProgress(null);
    setCardGenerationQueueProgress(null);
    const operationToken = startCancellableOperation();
    const partiallySavedCards: StudyCard[] = [];

    try {
      await waitForUiPaint();
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      const chunkResponse = await listDocumentChunks(document.document_id);
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      setDocumentChunks(chunkResponse.chunks);
      const currentChunkIds = new Set(cards.map((card) => card.chunkId));
      const remainingChunks = chunkResponse.chunks.filter(
        (chunk) => !currentChunkIds.has(chunk.id)
      );

      setOperationStatus("generatingCardsWithOllama");
      await waitForUiPaint();
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      const incrementallySavedCardIds = new Set<string>();
      const generatedCards =
        remainingChunks.length > 0
          ? await generateCardsWithFallback(remainingChunks, operationToken, {
              onChunkCards: async (chunkCards) => {
                await saveGeneratedChunkCards(
                  chunkCards,
                  operationToken,
                  incrementallySavedCardIds,
                  (savedChunkCards) => {
                    partiallySavedCards.push(...savedChunkCards);
                    setCards((currentCards) => [...currentCards, ...savedChunkCards]);

                    if (!activeCard && savedChunkCards.length > 0) {
                      setActiveCardIndex(0);
                      setIsAnswerVisible(false);
                    }
                  }
                );
              }
            })
          : [];
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      setOperationStatus("savingStudyCards");
      setCardGenerationProgress(null);
      setCardGenerationQueueProgress(null);
      const unsavedGeneratedCards = generatedCards.filter(
        (generatedCard) => !incrementallySavedCardIds.has(generatedCard.id)
      );
      const savedCards =
        unsavedGeneratedCards.length > 0 ? await saveStudyCards(unsavedGeneratedCards) : [];
      if (!isCurrentOperation(operationToken)) {
        return;
      }

      setChunkCount(chunkResponse.chunks.length);
      if (savedCards.length > 0) {
        setCards((currentCards) => [...currentCards, ...savedCards]);
      }

      if (!activeCard && savedCards.length > 0) {
        setActiveCardIndex(0);
        setIsAnswerVisible(false);
      }

      if (!activeStudySession) {
        await beginStudySession(document.document_id);
        if (!isCurrentOperation(operationToken)) {
          return;
        }
      }
    } catch (unknownError) {
      if (!isCurrentOperation(operationToken)) {
        return;
      }
      if (partiallySavedCards.length > 0) {
        setWarning(t("library.partialCardsSaved", { count: partiallySavedCards.length }));
      } else {
        setError(getErrorMessage(unknownError, t("library.unknownError")));
      }
    } finally {
      if (isCurrentOperation(operationToken)) {
        setOperationStatus(null);
        setCardGenerationProgress(null);
        setCardGenerationQueueProgress(null);
        operationAbortControllerRef.current = null;
      }
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
      setDocumentProgressSummaries((currentSummaries) =>
        currentSummaries.filter((summary) => summary.documentId !== documentToArchive.document_id)
      );
      setDocumentSessionSummariesById((currentSummariesByDocument) => {
        const nextSummariesByDocument = { ...currentSummariesByDocument };
        delete nextSummariesByDocument[documentToArchive.document_id];
        return nextSummariesByDocument;
      });

      if (document?.document_id === documentToArchive.document_id) {
        setDocument(null);
        setChunkCount(null);
        setDocumentChunks([]);
        setCards([]);
        invalidateTranslationLoad();
        setReaderTargetLanguage("En");
        setTranslatedDocumentPages({});
        setTranslatedDocumentPageSources({});
        setTranslatedDocumentPageProviders({});
        setTranslatedReaderPageIndexes([]);
        setTranslationErrorReaderPageIndexes([]);
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
      setError(getErrorMessage(unknownError, t("library.archiveError")));
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
        const summaries = await listStudySessionSummaries(documentToRestore.document_id);
        setDocumentReviewCounts((currentCounts) => ({
          ...currentCounts,
          [documentToRestore.document_id]: reviews.length
        }));
        setDocumentSessionSummariesById((currentSummariesByDocument) => ({
          ...currentSummariesByDocument,
          [documentToRestore.document_id]: summaries
        }));
        setDocumentProgressSummaries(
          buildDocumentProgressSummaries([...savedDocuments, documentToRestore], {
            ...documentSessionSummariesById,
            [documentToRestore.document_id]: summaries
          })
        );
      } catch {
        setDocumentReviewCounts((currentCounts) => ({
          ...currentCounts,
          [documentToRestore.document_id]: 0
        }));
      }
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("library.restoreError")));
    }
  }

  async function handleDeleteArchivedDocument(documentToDelete: ImportTextBookResponse) {
    const confirmed = confirmDelete(t("library.deleteConfirmation"));

    if (!confirmed) {
      return;
    }

    setError(null);
    setWarning(null);

    try {
      await deleteImportedDocument(documentToDelete.document_id);
      setArchivedDocuments((currentDocuments) =>
        currentDocuments.filter(
          (archivedDocument) => archivedDocument.document_id !== documentToDelete.document_id
        )
      );
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("library.deleteError")));
    }
  }

  async function handleDeleteStudyCards() {
    if (!document || cards.length === 0) {
      return;
    }

    const documentId = document.document_id;
    const confirmed = confirmDelete(t("study.deleteCardsConfirmation"));

    if (!confirmed) {
      return;
    }

    setError(null);
    setWarning(null);

    try {
      await deleteStudyCards(documentId);
      setCards([]);
      setActiveCardIndex(0);
      setIsAnswerVisible(false);
      setCardReviews({});
      setReviewHistory([]);
      setActiveStudySession(null);
      setStudySessionReviewCount(0);
      setStudySessionSummaries([]);
      setCardReviewSchedules({});
      setDocumentReviewCounts((currentCounts) => ({
        ...currentCounts,
        [documentId]: 0
      }));
      setDocumentSessionSummariesById((currentSummariesByDocument) => ({
        ...currentSummariesByDocument,
        [documentId]: []
      }));
      setDocumentProgressSummaries(
        buildDocumentProgressSummaries(savedDocuments, {
          ...documentSessionSummariesById,
          [documentId]: []
        })
      );
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("study.deleteCardsError")));
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
      const savedReview = await saveStudyReview(
        reviewedCard.id,
        review,
        activeStudySession?.id ?? null
      );
      setReviewHistory((currentReviews) => [...currentReviews, savedReview]);
      setStudySessionReviewCount((currentCount) => currentCount + 1);
      if (activeStudySession) {
        setStudySessionSummaries((currentSummaries) =>
          currentSummaries.map((summary) => {
            if (summary.session_id !== activeStudySession.id) {
              return summary;
            }

            return incrementSessionSummaryReview(summary, review);
          })
        );
        setDocumentSessionSummariesById((currentSummariesByDocument) => ({
          ...currentSummariesByDocument,
          [activeStudySession.document_id]: (
            currentSummariesByDocument[activeStudySession.document_id] ?? []
          ).map((summary) =>
            summary.session_id === activeStudySession.id
              ? incrementSessionSummaryReview(summary, review)
              : summary
          )
        }));
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
      if (document) {
        setDocumentProgressSummaries((currentSummaries) =>
          currentSummaries
            .map((summary) => {
              if (summary.documentId !== document.document_id) {
                return summary;
              }

              const nextReviewCount = summary.reviewCount + 1;
              const currentEasyCount = Math.round(
                (summary.reviewCount * summary.accuracyPercent) / 100
              );
              const nextEasyCount = currentEasyCount + (review === "easy" ? 1 : 0);

              return {
                ...summary,
                reviewCount: nextReviewCount,
                accuracyPercent: Math.round((nextEasyCount / nextReviewCount) * 100)
              };
            })
            .sort(
              (firstSummary, secondSummary) => secondSummary.reviewCount - firstSummary.reviewCount
            )
            .map((summary, index) => ({
              ...summary,
              isTopReviewed: index === 0 && summary.reviewCount > 0
            }))
        );
      }
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

  function handleStudyGoalInputChange(value: string) {
    if (!document) {
      return;
    }

    setStudyReviewGoalInputsByDocumentId((currentInputs) => ({
      ...currentInputs,
      [document.document_id]: value
    }));
  }

  function handleStudyGoalRecurrenceChange(recurrence: StudyGoalRecurrence) {
    if (!document) {
      return;
    }

    setStudyReviewGoalRecurrencesByDocumentId((currentRecurrences) => ({
      ...currentRecurrences,
      [document.document_id]: recurrence
    }));
  }

  async function handleStudyGoalNotificationChange(enabled: boolean) {
    setIsStudyGoalNotificationEnabled(enabled);

    try {
      const settings = await saveNotificationSettings({
        study_goal_reminders_enabled: enabled,
        study_goal_reminder_time: studyGoalReminderTime
      });
      setIsStudyGoalNotificationEnabled(settings.study_goal_reminders_enabled);
      setStudyGoalReminderTime(settings.study_goal_reminder_time);

      if (!settings.study_goal_reminders_enabled) {
        await cancelStudyGoalReminder();
      }
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("settings.notificationSettingsSaveError")));
    }
  }

  async function handleStudyGoalReminderTimeChange(reminderTime: string) {
    setStudyGoalReminderTime(reminderTime);

    try {
      const settings = await saveNotificationSettings({
        study_goal_reminders_enabled: isStudyGoalNotificationEnabled,
        study_goal_reminder_time: reminderTime
      });
      setIsStudyGoalNotificationEnabled(settings.study_goal_reminders_enabled);
      setStudyGoalReminderTime(settings.study_goal_reminder_time);
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("settings.notificationSettingsSaveError")));
    }
  }

  async function handleSaveStudyReviewGoal() {
    if (!document) {
      return;
    }

    const targetReviews = Number.parseInt(activeStudyReviewGoalInput, 10);

    if (!Number.isFinite(targetReviews) || targetReviews <= 0) {
      return;
    }

    try {
      const savedGoal = await saveStudyGoal(
        document.document_id,
        targetReviews,
        activeStudyReviewGoalRecurrence
      );

      setStudyReviewGoalsByDocumentId((currentGoals) => ({
        ...currentGoals,
        [document.document_id]: savedGoal.target_reviews
      }));
      setStudyReviewGoalInputsByDocumentId((currentInputs) => ({
        ...currentInputs,
        [document.document_id]: savedGoal.target_reviews.toString()
      }));
      setStudyReviewGoalRecurrencesByDocumentId((currentRecurrences) => ({
        ...currentRecurrences,
        [document.document_id]: savedGoal.recurrence
      }));

      const savedGoalProgress = buildStudyGoalProgress(
        studySessionSummaries,
        savedGoal.target_reviews,
        savedGoal.recurrence
      );
      const savedGoalAlertKey =
        savedGoalProgress && savedGoalProgress.remainingReviews > 0
          ? studyGoalAlertKey(savedGoal.recurrence)
          : null;

      if (isStudyGoalNotificationEnabled && savedGoalProgress && savedGoalAlertKey) {
        await notifyStudyGoalReminder({
          title: t("study.goalNotificationTitle"),
          body: t(savedGoalAlertKey, {
            count: savedGoalProgress.remainingReviews
          }),
          recurrence: savedGoal.recurrence,
          reminderTime: studyGoalReminderTime
        });
      }
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("study.goalSaveError")));
    }
  }

  async function handleExportStudySessionReport() {
    if (!document || studySessionSummaries.length === 0) {
      return;
    }

    const fileName = `relatorio-estudo-${sanitizeReportFileName(document.document_id)}.md`;

    try {
      setError(null);
      await downloadTextFile(fileName, buildStudySessionReport(document, studySessionSummaries));
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("study.exportFileError")));
    }
  }

  function handlePreviewPrintableStudySessionReport() {
    if (!document || studySessionSummaries.length === 0) {
      return;
    }

    setPrintableReportPreviewHtml(buildPrintableStudySessionReport(document, studySessionSummaries));
  }

  function handleExportPrintableStudySessionReport() {
    if (!document || studySessionSummaries.length === 0) {
      return;
    }

    const fileName = `relatorio-estudo-${sanitizeReportFileName(document.document_id)}.pdf`;
    printStudySessionReport(
      fileName,
      buildPrintableStudySessionReport(document, studySessionSummaries)
    );
  }

  async function handleExportAnkiPackage() {
    if (!document || cards.length === 0) {
      return;
    }

    const fileName = `anki-${sanitizeReportFileName(document.document_id)}.apkg`;

    try {
      setError(null);
      await exportAnkiPackage(fileName, getDocumentTitle(document), cards);
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("study.exportFileError")));
    }
  }

  async function handleExportAnkiTsvDeck() {
    if (!document || cards.length === 0) {
      return;
    }

    const fileName = `anki-${sanitizeReportFileName(document.document_id)}.tsv`;

    try {
      setError(null);
      await downloadTextFile(fileName, buildAnkiTsv(cards, document));
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("study.exportFileError")));
    }
  }

  async function handleSaveDocumentStudyMetadata() {
    if (!document) {
      return;
    }

    try {
      setError(null);
      setDocumentStudyMetadataStatus(null);
      setIsSavingDocumentStudyMetadata(true);
      const metadata = await saveDocumentStudyMetadata(
        document.document_id,
        categoryDraft.trim(),
        subcategoryDraft.trim(),
        categoryDescriptionDraft.trim()
      );

      setDocumentStudyMetadata(metadata);
      setCategoryDraft(metadata.category);
      setSubcategoryDraft(metadata.subcategory);
      setCategoryDescriptionDraft(metadata.description);
      setDocumentStudyMetadataById((currentMetadataById) => ({
        ...currentMetadataById,
        [metadata.document_id]: metadata
      }));
      setDocumentStudyMetadataStatus(t("study.categoryMetadataSaved"));
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("study.categoryMetadataSaveError")));
    } finally {
      setIsSavingDocumentStudyMetadata(false);
    }
  }

  async function handleSaveMeditationNote() {
    if (!document) {
      return;
    }

    try {
      setError(null);
      setMeditationStatus(null);
      setIsSavingMeditationNote(true);
      const response = editingMeditationNoteId
        ? await updateMeditationNote(document.document_id, editingMeditationNoteId, meditationDraft)
        : await addMeditationNote(document.document_id, meditationDraft);

      setMeditationNotes(response.notes);
      setMeditationDraft("");
      setEditingMeditationNoteId(null);
      setIsMeditationEditorOpen(false);
      setMeditationStatus(
        editingMeditationNoteId ? t("study.meditationUpdated") : t("study.meditationAdded")
      );
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("study.meditationSaveError")));
    } finally {
      setIsSavingMeditationNote(false);
    }
  }

  async function handleDeleteMeditationNote(noteId: string) {
    if (!document || !confirmDelete(t("study.confirmDeleteMeditation"))) {
      return;
    }

    try {
      setError(null);
      setMeditationStatus(null);
      setDeletingMeditationNoteId(noteId);
      const response = await deleteMeditationNote(document.document_id, noteId);

      setMeditationNotes(response.notes);
      if (editingMeditationNoteId === noteId) {
        setEditingMeditationNoteId(null);
        setMeditationDraft("");
        setIsMeditationEditorOpen(false);
      }
      setMeditationStatus(t("study.meditationDeleted"));
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, t("study.meditationSaveError")));
    } finally {
      setDeletingMeditationNoteId(null);
    }
  }

  const activeMeditationNote = editingMeditationNoteId
    ? meditationNotes.find((note) => note.id === editingMeditationNoteId)
    : null;
  const isDocumentStudyMetadataSaveDisabled =
    isLoadingDocumentStudyMetadata ||
    isSavingDocumentStudyMetadata ||
    categoryDraft.trim().length === 0 ||
    subcategoryDraft.trim().length === 0 ||
    categoryDescriptionDraft.trim().length === 0 ||
    (documentStudyMetadata
      ? categoryDraft.trim() === documentStudyMetadata.category &&
        subcategoryDraft.trim() === documentStudyMetadata.subcategory &&
        categoryDescriptionDraft.trim() === documentStudyMetadata.description
      : false);
  const documentStudyMetadataSlot = document ? (
    <section className="document-study-metadata" aria-labelledby="document-study-metadata-title">
      <div className="document-study-metadata-header">
        <h3 id="document-study-metadata-title">{t("study.categoryTitle")}</h3>
        {documentStudyMetadata ? (
          <span>
            {getAcademicCategoryDisplayName(documentStudyMetadata.category, t)} /{" "}
            {getAcademicSubcategoryDisplayName(documentStudyMetadata.subcategory, t)}
          </span>
        ) : (
          <span>{t("study.categoryMetadataEmpty")}</span>
        )}
      </div>
      <div className="document-study-metadata-fields">
        <label htmlFor="document-study-category">
          {t("study.categoryLabel")}
          <input
            id="document-study-category"
            value={categoryDraft}
            disabled={isLoadingDocumentStudyMetadata}
            placeholder={t("study.categoryPlaceholder")}
            onChange={(event) => {
              setCategoryDraft(event.target.value);
              setDocumentStudyMetadataStatus(null);
            }}
          />
        </label>
        <label htmlFor="document-study-subcategory">
          {t("study.subcategoryLabel")}
          <input
            id="document-study-subcategory"
            value={subcategoryDraft}
            disabled={isLoadingDocumentStudyMetadata}
            placeholder={t("study.subcategoryPlaceholder")}
            onChange={(event) => {
              setSubcategoryDraft(event.target.value);
              setDocumentStudyMetadataStatus(null);
            }}
          />
        </label>
      </div>
      <label htmlFor="document-study-description">
        {t("study.categoryDescriptionLabel")}
        <textarea
          id="document-study-description"
          value={categoryDescriptionDraft}
          disabled={isLoadingDocumentStudyMetadata}
          placeholder={t("study.categoryDescriptionPlaceholder")}
          onChange={(event) => {
            setCategoryDescriptionDraft(event.target.value);
            setDocumentStudyMetadataStatus(null);
          }}
        />
      </label>
      <div className="document-study-metadata-actions">
        <button
          type="button"
          disabled={isDocumentStudyMetadataSaveDisabled}
          onClick={() => {
            void handleSaveDocumentStudyMetadata();
          }}
        >
          {isSavingDocumentStudyMetadata
            ? t("study.savingCategoryMetadata")
            : t("study.saveCategoryMetadata")}
        </button>
        {documentStudyMetadataStatus ? <span role="status">{documentStudyMetadataStatus}</span> : null}
      </div>
    </section>
  ) : null;
  const isMeditationSaveDisabled =
    isLoadingMeditationNote ||
    isSavingMeditationNote ||
    meditationDraft.trim().length === 0 ||
    (activeMeditationNote ? meditationDraft.trim() === activeMeditationNote.content : false);
  const meditationSlot = document ? (
    <div className="meditation-note meditation-note-reader">
      <button
        type="button"
        className="meditation-note-open"
        aria-label={t("study.openMeditationPanel")}
        disabled={isLoadingMeditationNote}
        onClick={() => {
          setIsMeditationPanelOpen(true);
        }}
      >
        <span aria-hidden="true">+</span>
      </button>
      {isMeditationPanelOpen ? (
        <div className="meditation-note-overlay" role="presentation">
          <section
            id="meditation-note-panel"
            className="meditation-note-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="meditation-note-title"
          >
            <div className="meditation-note-panel-header">
              <div>
                <h4 id="meditation-note-title">{t("study.meditationTitle")}</h4>
                <span>{t("study.meditationListSummary", { count: meditationNotes.length })}</span>
              </div>
              <button
                type="button"
                className="meditation-note-close"
                aria-label={t("study.closeMeditation")}
                disabled={isSavingMeditationNote || deletingMeditationNoteId !== null}
                onClick={() => {
                  setIsMeditationPanelOpen(false);
                  setMeditationDraft("");
                  setEditingMeditationNoteId(null);
                  setIsMeditationEditorOpen(false);
                }}
              >
                x
              </button>
            </div>
            {meditationNotes.length > 0 ? (
              <ol className="meditation-note-list">
                {meditationNotes.map((note, index) => (
                  <li key={note.id}>
                    <div>
                      <strong>{t("study.meditationEntryLabel", { number: index + 1 })}</strong>
                      <p>{note.content}</p>
                    </div>
                    <div className="meditation-note-item-actions">
                      <button
                        type="button"
                        disabled={isSavingMeditationNote || deletingMeditationNoteId !== null}
                        onClick={() => {
                          setMeditationDraft(note.content);
                          setEditingMeditationNoteId(note.id);
                          setMeditationStatus(null);
                          setIsMeditationEditorOpen(true);
                        }}
                      >
                        {t("study.editMeditation")}
                      </button>
                      <button
                        type="button"
                        disabled={isSavingMeditationNote || deletingMeditationNoteId !== null}
                        onClick={() => {
                          void handleDeleteMeditationNote(note.id);
                        }}
                      >
                        {deletingMeditationNoteId === note.id
                          ? t("study.deletingMeditation")
                          : t("study.deleteMeditation")}
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="reader-placeholder">{t("study.meditationEmpty")}</p>
            )}
            <button
              type="button"
              className="meditation-note-add"
              disabled={isLoadingMeditationNote || isSavingMeditationNote}
              onClick={() => {
                setMeditationDraft("");
                setEditingMeditationNoteId(null);
                setMeditationStatus(null);
                setIsMeditationEditorOpen(true);
              }}
            >
              {t("study.addMeditation")}
            </button>
            {isMeditationEditorOpen ? (
              <>
                <label htmlFor="meditation-note-content">{t("study.meditationLabel")}</label>
                <textarea
                  id="meditation-note-content"
                  value={meditationDraft}
                  disabled={isLoadingMeditationNote}
                  placeholder={t("study.meditationPlaceholder")}
                  onChange={(event) => {
                    setMeditationDraft(event.target.value);
                    setMeditationStatus(null);
                  }}
                />
                <div className="meditation-note-actions">
                  <button
                    type="button"
                    disabled={isMeditationSaveDisabled}
                    onClick={() => {
                      void handleSaveMeditationNote();
                    }}
                  >
                    {isSavingMeditationNote ? t("study.savingMeditation") : t("study.saveMeditation")}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingMeditationNote}
                    onClick={() => {
                      setMeditationDraft("");
                      setEditingMeditationNoteId(null);
                      setIsMeditationEditorOpen(false);
                    }}
                  >
                    {t("study.cancelMeditationEdit")}
                  </button>
                </div>
              </>
            ) : null}
            {isLoadingMeditationNote ? (
              <span role="status">{t("study.loadingMeditation")}</span>
            ) : null}
            {meditationStatus ? <span role="status">{meditationStatus}</span> : null}
          </section>
        </div>
      ) : null}
    </div>
  ) : null;

  const renderStudyCategoryManagerItem = (category: StudyCategory) => {
    const linkedBookCount = countDocumentsByCategory(
      savedDocuments,
      documentStudyMetadataById,
      category.name
    );
    const isDeleteBlocked = linkedBookCount > 0;

    return (
      <li key={category.id}>
        <div>
          <strong>{category.name}</strong>
          <span>{category.subcategories.join(", ")}</span>
          <span>{t("library.studyCategoryUsage", { count: linkedBookCount })}</span>
        </div>
        <div className="category-manager-item-actions">
          <button type="button" onClick={() => handleEditStudyCategory(category)}>
            {t("library.editStudyCategory")}
          </button>
          {category.archived ? (
            <button
              type="button"
              onClick={() => {
                void handleRestoreStudyCategory(category);
              }}
            >
              {t("library.restoreStudyCategory")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                void handleArchiveStudyCategory(category);
              }}
            >
              {t("library.archiveStudyCategory")}
            </button>
          )}
          <button
            type="button"
            disabled={isDeleteBlocked}
            title={
              isDeleteBlocked ? t("library.deleteStudyCategoryBlockedByBooks") : undefined
            }
            onClick={() => {
              void handleDeleteStudyCategory(category);
            }}
          >
            {t("library.deleteStudyCategory")}
          </button>
        </div>
      </li>
    );
  };

  const workspaceFeedback =
    error || warning || operationStatus ? (
      <div className="workspace-feedback" aria-live="polite">
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
          <div className="operation-status">
            <p className="message info" role="status">
              {activeOperationMessage}
            </p>
            <button type="button" onClick={handleCancelOperation}>
              {t("library.cancelOperation")}
            </button>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <main className="app-shell">
      <section className="workspace" aria-labelledby="app-title">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{t("app.stage")}</p>
            <h1 id="app-title">{t("app.title")}</h1>
          </div>
          <div className="workspace-header-actions">
            <label className="language-selector" htmlFor="ui-language">
              <span>{t("settings.uiLanguageLabel")}</span>
              <select
                id="ui-language"
                value={uiLanguage}
                onChange={(event) => {
                  void handleUiLanguageChange(event.target.value as UiLanguage);
                }}
              >
                <option value="pt">{t("settings.uiLanguagePortuguese")}</option>
                <option value="en">{t("settings.uiLanguageEnglish")}</option>
                <option value="es">{t("settings.uiLanguageSpanish")}</option>
              </select>
            </label>
            {isLibraryView ? (
              <>
                <label className="library-category-control" htmlFor="library-category-filter">
                  <span>{t("library.categoryFilterLabel")}</span>
                  <select
                    id="library-category-filter"
                    value={selectedCategoryFilter}
                    onChange={(event) => {
                      handleLibraryCategoryChange(event.target.value);
                    }}
                  >
                    <option value="">{t("library.allCategories")}</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {getAcademicCategoryDisplayName(category, t)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="library-category-control" htmlFor="library-subcategory-filter">
                  <span>{t("library.subcategoryFilterLabel")}</span>
                  <select
                    id="library-subcategory-filter"
                    value={selectedSubcategoryFilter}
                    disabled={!selectedCategoryFilter}
                    onChange={(event) => setSelectedSubcategoryFilter(event.target.value)}
                  >
                    <option value="">{t("library.allSubcategories")}</option>
                    {subcategoryOptions.map((subcategory) => (
                      <option key={subcategory} value={subcategory}>
                        {getAcademicSubcategoryDisplayName(subcategory, t)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="primary-header-button"
                  disabled={isWorkspaceBusy}
                  onClick={openImportDialog}
                >
                  {t("library.openImportDialog")}
                </button>
                <button
                  type="button"
                  className="my-books-button"
                  onClick={() => setIsBooksPanelOpen(true)}
                >
                  {t("library.myBooks")}
                </button>
                <button
                  type="button"
                  className="my-books-button"
                  onClick={() => setIsCategoryManagerOpen(true)}
                >
                  {t("library.manageCategories")}
                </button>
              </>
            ) : null}
          </div>
        </header>

        <nav className="library-breadcrumb" aria-label={t("library.breadcrumbLabel")}>
          {breadcrumbItems.map((item, index) => (
            <span key={`${item}-${index}`}>
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item}
            </span>
          ))}
        </nav>

        {isImportDialogOpen ? (
          <div className="import-dialog-overlay" role="presentation">
            <section
              className="import-dialog-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="import-dialog-title"
            >
              <div className="import-dialog-header">
                <div>
                  <h2 id="import-dialog-title">{t("library.importDialogTitle")}</h2>
                  <p>{t("library.importDialogDescription")}</p>
                </div>
                <button
                  type="button"
                  aria-label={t("library.closeImportDialog")}
                  disabled={isImporting}
                  onClick={() => setIsImportDialogOpen(false)}
                >
                  x
                </button>
              </div>
              <ImportPanel
                filePath={filePath}
                isOcrEnabled={isOcrEnabled}
                ocrLanguage={ocrLanguage}
                isImporting={isImporting}
                labels={{
                  filePathLabel: t("library.filePathLabel"),
                  filePathPlaceholder: t("library.filePathPlaceholder"),
                  ocrLabel: t("library.ocrLabel"),
                  ocrLanguageLabel: t("library.ocrLanguageLabel"),
                  ocrPortuguese: t("library.ocrPortuguese"),
                  ocrEnglish: t("library.ocrEnglish"),
                  ocrSpanish: t("library.ocrSpanish"),
                  chooseFile: t("library.chooseFile"),
                  import: t("library.import"),
                  importing: t("library.importing")
                }}
                onFilePathChange={setFilePath}
                onOcrEnabledChange={setIsOcrEnabled}
                onOcrLanguageChange={setOcrLanguage}
                onChooseFile={() => {
                  void handleChooseFile();
                }}
                onSubmit={handleSubmit}
              >
                <div className="import-classification-fields">
                  <label htmlFor="import-category">
                    {t("library.importCategoryLabel")}
                    <select
                      id="import-category"
                      value={importCategory}
                      disabled={isImporting}
                      onChange={(event) => handleImportCategoryChange(event.target.value)}
                    >
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {getAcademicCategoryDisplayName(category, t)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="import-subcategory">
                    {t("library.importSubcategoryLabel")}
                    <select
                      id="import-subcategory"
                      value={importSubcategory}
                      disabled={isImporting}
                      onChange={(event) => setImportSubcategory(event.target.value)}
                    >
                      {importSubcategoryOptions.map((subcategory) => (
                        <option key={subcategory} value={subcategory}>
                          {getAcademicSubcategoryDisplayName(subcategory, t)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="library-import-description">
                    {t("library.categoryImportDescriptionLabel")}
                    <input
                      id="library-import-description"
                      value={importCategoryDescriptionDraft}
                      disabled={isImporting}
                      placeholder={t("library.categoryImportDescriptionPlaceholder")}
                      onChange={(event) => setImportCategoryDescriptionDraft(event.target.value)}
                    />
                  </label>
                </div>
              </ImportPanel>
            </section>
          </div>
        ) : null}

        {isBooksPanelOpen ? (
          <div className="my-books-overlay" role="presentation">
            <section
              className="my-books-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="my-books-title"
            >
              <div className="my-books-panel-header">
                <div>
                  <h2 id="my-books-title">{t("library.myBooksTitle")}</h2>
                  <span>{t("library.myBooksCount", { count: filteredSavedDocuments.length })}</span>
                </div>
                <button
                  type="button"
                  aria-label={t("library.closeMyBooks")}
                  onClick={() => setIsBooksPanelOpen(false)}
                >
                  x
                </button>
              </div>
              {filteredSavedDocuments.length > 0 ? (
                <ul className="my-books-list">
                  {filteredSavedDocuments.map((savedDocument) => {
                    const metadata = documentStudyMetadataById[savedDocument.document_id] ?? null;

                    return (
                      <li key={savedDocument.document_id}>
                        <button
                          type="button"
                          disabled={isWorkspaceBusy}
                          onClick={() => handleSelectBookFromPanel(savedDocument)}
                        >
                          <strong>{getDocumentTitle(savedDocument)}</strong>
                          {metadata ? (
                            <span>
                              {getAcademicCategoryDisplayName(metadata.category, t)} /{" "}
                              {getAcademicSubcategoryDisplayName(metadata.subcategory, t)}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>{t("library.noBooksInCategory")}</p>
              )}
            </section>
          </div>
        ) : null}

        {isCategoryManagerOpen ? (
          <div className="my-books-overlay" role="presentation">
            <section
              className="my-books-panel category-manager-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="category-manager-title"
            >
              <div className="my-books-panel-header">
                <div>
                  <h2 id="category-manager-title">{t("library.manageCategories")}</h2>
                  <span>{t("library.manageCategoriesDescription")}</span>
                </div>
                <button
                  type="button"
                  aria-label={t("library.closeManageCategories")}
                  onClick={() => setIsCategoryManagerOpen(false)}
                >
                  x
                </button>
              </div>

              <div className="category-manager-default">
                <div>
                  <h3>{t("library.defaultStudyCategoryTitle")}</h3>
                  <p>{t("library.defaultStudyCategoryDescription")}</p>
                </div>
                <label htmlFor="default-study-category">
                  {t("library.defaultStudyCategoryLabel")}
                  <select
                    id="default-study-category"
                    value={defaultCategoryDraft}
                    disabled={isSavingStudyCategoryDefault}
                    onChange={(event) => handleDefaultStudyCategoryChange(event.target.value)}
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {getAcademicCategoryDisplayName(category, t)}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="default-study-subcategory">
                  {t("library.defaultStudySubcategoryLabel")}
                  <select
                    id="default-study-subcategory"
                    value={defaultSubcategoryDraft}
                    disabled={isSavingStudyCategoryDefault}
                    onChange={(event) => {
                      setDefaultSubcategoryDraft(event.target.value);
                      setCategoryManagerStatus(null);
                    }}
                  >
                    {defaultSubcategoryOptions.map((subcategory) => (
                      <option key={subcategory} value={subcategory}>
                        {getAcademicSubcategoryDisplayName(subcategory, t)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={isStudyCategoryDefaultSaveDisabled}
                  onClick={() => {
                    void handleSaveStudyCategoryDefault();
                  }}
                >
                  {isSavingStudyCategoryDefault
                    ? t("library.savingStudyCategoryDefault")
                    : t("library.saveStudyCategoryDefault")}
                </button>
              </div>

              <div className="category-manager-form">
                {categoryManagerDraftId ? (
                  <p className="category-manager-editing">
                    {t("library.editingStudyCategory", {
                      category: categoryManagerNameDraft
                    })}
                  </p>
                ) : null}
                <label htmlFor="study-category-name">
                  {t("library.studyCategoryNameLabel")}
                  <input
                    id="study-category-name"
                    value={categoryManagerNameDraft}
                    disabled={isSavingStudyCategory}
                    onChange={(event) => {
                      setCategoryManagerNameDraft(event.target.value);
                      setCategoryManagerStatus(null);
                    }}
                  />
                </label>
                <label htmlFor="study-category-subcategories">
                  {t("library.studyCategorySubcategoriesLabel")}
                  <textarea
                    id="study-category-subcategories"
                    value={categoryManagerSubcategoriesDraft}
                    disabled={isSavingStudyCategory}
                    placeholder={t("library.studyCategorySubcategoriesPlaceholder")}
                    onChange={(event) => {
                      setCategoryManagerSubcategoriesDraft(event.target.value);
                      setCategoryManagerStatus(null);
                    }}
                  />
                </label>
                <div className="category-manager-actions">
                  <button
                    type="button"
                    disabled={isStudyCategorySaveDisabled}
                    onClick={() => {
                      void handleSaveStudyCategory();
                    }}
                  >
                    {isSavingStudyCategory
                      ? t("library.savingStudyCategory")
                      : categoryManagerDraftId
                        ? t("library.updateStudyCategory")
                        : t("library.saveStudyCategory")}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingStudyCategory}
                    onClick={resetStudyCategoryManagerDraft}
                  >
                    {t("library.clearStudyCategoryForm")}
                  </button>
                </div>
                {categoryManagerStatus ? (
                  <span role="status">{categoryManagerStatus}</span>
                ) : null}
              </div>

              <section className="category-manager-section">
                <h3>{t("library.activeStudyCategoriesTitle")}</h3>
                {activeStudyCategories.length > 0 ? (
                  <ul className="category-manager-list">
                    {activeStudyCategories.map(renderStudyCategoryManagerItem)}
                  </ul>
                ) : (
                  <p>{t("library.noCustomStudyCategories")}</p>
                )}
              </section>

              <section className="category-manager-section">
                <h3>{t("library.archivedStudyCategoriesTitle")}</h3>
                {archivedStudyCategories.length > 0 ? (
                  <ul className="category-manager-list">
                    {archivedStudyCategories.map(renderStudyCategoryManagerItem)}
                  </ul>
                ) : (
                  <p>{t("library.noArchivedStudyCategories")}</p>
                )}
              </section>
            </section>
          </div>
        ) : null}

        {workspaceFeedback}

        <div className={isLibraryView ? "workspace-grid" : "study-page"}>
          {isLibraryView ? (
            <>
          <section className="workspace-panel import-settings-panel" aria-labelledby="import-settings-title">
            <h2 id="import-settings-title">{t("layout.importAndAi")}</h2>
            <button
              type="button"
              className="import-book-button"
              disabled={isWorkspaceBusy}
              onClick={openImportDialog}
            >
              {t("library.openImportDialog")}
            </button>

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

            <OcrDependenciesPanel
              dependencies={ocrDependencies}
              isLoading={isLoadingOcrDependencies}
              labels={{
                title: t("settings.ocrTitle"),
                loading: t("settings.loadingOcrDependencies"),
                ready: t("settings.ocrReady"),
                missing: t("settings.ocrMissing"),
                install: t("settings.ocrInstallCommand"),
                pdftoppmAvailable: t("settings.pdftoppmAvailable"),
                pdftoppmMissing: t("settings.pdftoppmMissing"),
                tesseractAvailable: t("settings.tesseractAvailable"),
                tesseractMissing: t("settings.tesseractMissing")
              }}
            />
          </section>

          <section className="workspace-panel library-panel" aria-labelledby="library-panel-title">
            <h2 id="library-panel-title">{t("layout.library")}</h2>
            <section className="library-navigation" aria-labelledby="library-navigation-title">
              <div className="library-navigation-header">
                <div>
                  <h2 id="library-navigation-title">{t("library.categoriesTitle")}</h2>
                  <p>{t("library.categoriesDescription")}</p>
                </div>
                {hasSelectedLibraryCategory ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setSelectedCategoryFilter("");
                      setSelectedSubcategoryFilter("");
                    }}
                  >
                    {t("library.backToCategories")}
                  </button>
                ) : null}
              </div>

              {!hasSelectedLibraryCategory ? (
                <ul className="category-grid">
                  {categoryOptions.map((category) => (
                    <li key={category}>
                      <button type="button" onClick={() => handleLibraryCategoryChange(category)}>
                        <strong>{getAcademicCategoryDisplayName(category, t)}</strong>
                        <span>
                          {t("library.categoryBookCount", {
                            count: countDocumentsByCategory(
                              savedDocuments,
                              documentStudyMetadataById,
                              category
                            )
                          })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="subcategory-navigation">
                  <h3>{getAcademicCategoryDisplayName(selectedCategoryFilter, t)}</h3>
                  <ul className="subcategory-grid">
                    <li>
                      <button
                        type="button"
                        className={!selectedSubcategoryFilter ? "is-active" : undefined}
                        onClick={() => setSelectedSubcategoryFilter("")}
                      >
                        <strong>{t("library.allSubcategories")}</strong>
                        <span>
                          {t("library.categoryBookCount", {
                            count: countDocumentsByCategory(
                              savedDocuments,
                              documentStudyMetadataById,
                              selectedCategoryFilter
                            )
                          })}
                        </span>
                      </button>
                    </li>
                    {subcategoryOptions.map((subcategory) => (
                      <li key={subcategory}>
                        <button
                          type="button"
                          className={
                            selectedSubcategoryFilter === subcategory ? "is-active" : undefined
                          }
                          onClick={() => setSelectedSubcategoryFilter(subcategory)}
                        >
                          <strong>{getAcademicSubcategoryDisplayName(subcategory, t)}</strong>
                          <span>
                            {t("library.categoryBookCount", {
                              count: countDocumentsByCategory(
                                savedDocuments,
                                documentStudyMetadataById,
                                selectedCategoryFilter,
                                subcategory
                              )
                            })}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {visibleDocumentProgressSummaries.length > 0 ? (
              <section className="progress-comparison" aria-labelledby="progress-comparison-title">
                <h2 id="progress-comparison-title">{t("progress.title")}</h2>
                <ul>
                  {visibleDocumentProgressSummaries.map((summary) => (
                    <li key={summary.documentId}>
                      <div>
                        <span>{summary.isTopReviewed ? t("progress.topReviewed") : t("progress.document")}</span>
                        <strong>{summary.title}</strong>
                      </div>
                      <dl>
                        <div>
                          <dt>{t("progress.sessionsLabel")}</dt>
                          <dd>{t("progress.sessions", { count: summary.sessionCount })}</dd>
                        </div>
                        <div>
                          <dt>{t("progress.reviewsLabel")}</dt>
                          <dd>{t("progress.reviews", { count: summary.reviewCount })}</dd>
                        </div>
                        <div>
                          <dt>{t("progress.accuracyLabel")}</dt>
                          <dd>{t("progress.accuracy", { percent: summary.accuracyPercent })}</dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {hasSelectedLibraryCategory ? (
              <SavedDocumentsList
                documents={navigatedSavedDocuments}
                isLoading={isLoadingSavedDocuments}
                isInteractionDisabled={isWorkspaceBusy}
                filters={{
                  sourceType: sourceTypeFilter,
                  reviewStatus: reviewStatusFilter,
                  searchQuery: librarySearchQuery,
                  sortMode: librarySortMode,
                  hasExternalFilter:
                    selectedCategoryFilter.trim().length > 0 ||
                    selectedSubcategoryFilter.trim().length > 0
                }}
                labels={{
                  title: t("library.savedDocuments"),
                  loading: t("library.loadingSavedDocuments"),
                  empty: t("library.noSavedDocuments"),
                  noFilterResults: t("library.noFilteredDocuments"),
                  searchLabel: t("library.searchLabel"),
                  searchPlaceholder: t("library.searchPlaceholder"),
                  searchAction: t("library.searchAction"),
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
            ) : null}

            <ArchivedDocumentsList
              documents={archivedDocuments}
              isLoading={isLoadingArchivedDocuments}
              isInteractionDisabled={isWorkspaceBusy}
              labels={{
                title: t("library.archivedDocuments"),
                loading: t("library.loadingArchivedDocuments"),
                empty: t("library.noArchivedDocuments"),
                restore: t("library.restoreDocument"),
                deleteForever: t("library.deleteDocumentForever"),
                itemLabel: (index) => t("library.archivedDocumentItem", { number: index + 1 }),
                sourceType: (sourceType) => getSourceTypeLabel(sourceType, t)
              }}
              onRestoreDocument={(selectedDocument) => {
                void handleRestoreDocument(selectedDocument);
              }}
              onDeleteDocument={(selectedDocument) => {
                void handleDeleteArchivedDocument(selectedDocument);
              }}
            />
          </section>

            </>
          ) : null}

          {!isLibraryView ? (
            <section className="study-page-toolbar" aria-label={t("library.studyPageNavigation")}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setCurrentView("library")}
              >
                {t("library.backToLibrary")}
              </button>
              <strong>{document ? getDocumentTitle(document) : t("layout.activeStudy")}</strong>
            </section>
          ) : null}

          {!isLibraryView ? (
          <section
            ref={activeStudyPanelRef}
            className="workspace-panel study-panel"
            aria-labelledby="active-study-title"
          >
            <h2 id="active-study-title">{t("layout.activeStudy")}</h2>
            {document ? (
              <>
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
              cardCount: t("library.cardCount", { count: cards.length }),
              generateCards: t("library.generateCards"),
              extractedTextTitle: t("library.extractedTextTitle"),
              extractedTextMeta: (characterCount) =>
                t("library.extractedTextMeta", { characterCount }),
              readerTitle: t("library.readerTitle"),
              readerLanguageLabel: t("library.readerLanguageLabel"),
              readerPortuguese: t("library.readerPortuguese"),
              readerEnglish: t("library.readerEnglish"),
              readerSpanish: t("library.readerSpanish"),
              originalPaneTitle: t("library.originalPaneTitle"),
              showOriginalPane: t("library.showOriginalPane"),
              hideOriginalPane: t("library.hideOriginalPane"),
              translatedPaneTitle: t("library.translatedPaneTitle"),
              translationPlaceholder: t("library.translationPlaceholder"),
              translationSameLanguage: t("library.translationSameLanguage"),
              translationStatusCached: t("library.translationStatusCached"),
              translationStatusGenerated: t("library.translationStatusGenerated"),
              translationProviderStatus: (provider) =>
                t("library.translationProviderStatus", { provider }),
              translationProviderLabel: (provider) =>
                t(`library.translationProviders.${provider}`),
              translateDocument: t("library.translateDocument"),
              retranslateDocument: t("library.retranslateDocument"),
              retryTranslationPage: t("library.retryTranslationPage"),
              translatingDocument: t("library.translatingDocumentAction"),
              translationCurrentPageError: t("library.translationCurrentPageError"),
              previousReaderPage: t("library.previousReaderPage"),
              nextReaderPage: t("library.nextReaderPage"),
              readerPageStatus: (currentPage, totalPages) =>
                t("library.readerPageStatus", { currentPage, totalPages }),
              readerBookmarkStatus: (currentPage, totalPages) =>
                t("library.readerBookmarkStatus", { currentPage, totalPages }),
              translatedReaderPages: (pages) =>
                t("library.translatedReaderPages", { pages }),
              translationErrorReaderPages: (pages) =>
                t("library.translationErrorReaderPages", { pages }),
              pdfReaderTitle: t("library.pdfReaderTitle"),
              previousPdfPage: t("library.previousPdfPage"),
              previousPdfPageLabel: t("library.previousPdfPageLabel"),
              nextPdfPage: t("library.nextPdfPage"),
              nextPdfPageLabel: t("library.nextPdfPageLabel"),
              pdfPageStatus: (currentPage, totalPages) =>
                t("library.pdfPageStatus", { currentPage, totalPages }),
              pdfZoomLabel: t("library.pdfZoomLabel"),
              pdfPageImageAlt: (page) => t("library.pdfPageImageAlt", { page }),
              renderingPdfPage: t("library.renderingPdfPage"),
              expandPreview: t("library.expandPreview"),
              collapsePreview: t("library.collapsePreview")
            }}
            originalLanguage={activeDocumentLanguage ?? document.language}
            readerTargetLanguage={readerTargetLanguage}
            translatedPagesByIndex={translatedDocumentPages}
            translatedPageSourcesByIndex={translatedDocumentPageSources}
            translatedPageProvidersByIndex={translatedDocumentPageProviders}
            translatedReaderPageIndexes={translatedReaderPageIndexes}
            translationErrorReaderPageIndexes={translationErrorReaderPageIndexes}
            renderedPdfPage={renderedPdfPage}
            isRenderingPdfPage={isRenderingPdfPage}
            readerPage={readerPage}
            pdfReaderPage={pdfReaderPage}
            pdfReaderZoom={pdfReaderZoom}
            isGeneratingCards={isCardGenerationBusy}
            isTranslatingDocument={isTranslatingDocument}
            onPdfReaderPageChange={setPdfReaderPage}
            onPdfReaderZoomChange={setPdfReaderZoom}
            onGenerateCards={() => {
              void handleGenerateCardsForActiveDocument();
            }}
            onReaderTargetLanguageChange={handleReaderTargetLanguageChange}
            onReaderPageChange={handleReaderPageChange}
            onTranslateDocument={(request) => {
              void handleTranslateActiveDocument(request);
            }}
            documentStudyMetadataSlot={documentStudyMetadataSlot}
            meditationSlot={meditationSlot}
          >
            <div className="document-actions">
              <button type="button" onClick={handleExportAnkiPackage}>
                {t("study.exportAnkiPackage")}
              </button>
              <button type="button" onClick={handleExportAnkiTsvDeck}>
                {t("study.exportAnkiTsv")}
              </button>
              <button
                className="danger-button"
                type="button"
                disabled={isWorkspaceBusy}
                onClick={() => {
                  void handleDeleteStudyCards();
                }}
              >
                {t("study.deleteCards")}
              </button>
              {canGenerateMoreCards ? (
                <button
                  type="button"
                  disabled={isCardGenerationBusy}
                  onClick={() => {
                    void handleGenerateMoreCardsForActiveDocument();
                  }}
                >
                  {t("study.generateMoreCards")}
                </button>
              ) : null}
            </div>
            {activeCard ? (
              <StudyCardViewer
                card={activeCard}
                isAnswerVisible={isAnswerVisible}
                isPreviousDisabled={activeCardIndex <= 0}
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
                  previousCard: t("study.previousCard"),
                  nextCard: t("study.nextCard"),
                  again: t("study.again"),
                  hard: t("study.hard"),
                  easy: t("study.easy")
                }}
                onRevealAnswer={() => setIsAnswerVisible(true)}
                onPreviousCard={() => {
                  setActiveCardIndex((currentIndex) => Math.max(currentIndex - 1, 0));
                  setIsAnswerVisible(false);
                }}
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
            {reviewHistory.length > 0 ? (
              <section className="retention-metrics" aria-labelledby="retention-metrics-title">
                <h3 id="retention-metrics-title">{t("study.retentionTitle")}</h3>
                <div className="retention-summary">
                  <strong>
                    {t("study.retentionRate", {
                      percent: retentionMetrics.retentionPercent
                    })}
                  </strong>
                  <span>
                    {t("study.hardCardsSummary", {
                      count: retentionMetrics.hardCardCount
                    })}
                  </span>
                </div>
                {retentionMetrics.hardCards.length > 0 ? (
                  <ul>
                    {retentionMetrics.hardCards.map((hardCard) => (
                      <li key={hardCard.cardId}>
                        <span>
                          {t("study.hardCardMeta", {
                            rating: getReviewRatingLabel(hardCard.rating, t),
                            priority: hardCard.priority
                          })}
                        </span>
                        <strong>{hardCard.front}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{t("study.noHardCards")}</p>
                )}
              </section>
            ) : null}
            {studyMetricPeriodSummary ? (
              <section className="study-metric-period" aria-labelledby="study-metric-period-title">
                <div className="study-metric-period-header">
                  <h3 id="study-metric-period-title">{t("study.metricPeriodTitle")}</h3>
                  <label htmlFor="metric-period-filter">
                    {t("study.metricPeriodFilterLabel")}
                  </label>
                  <select
                    id="metric-period-filter"
                    value={metricPeriodFilter}
                    onChange={(event) =>
                      setMetricPeriodFilter(event.target.value as MetricPeriodFilter)
                    }
                  >
                    <option value="all">{t("study.metricPeriodAll")}</option>
                    <option value="last7">{t("study.metricPeriodLast7")}</option>
                    <option value="last30">{t("study.metricPeriodLast30")}</option>
                  </select>
                </div>
                <dl>
                  <div>
                    <dt>{t("progress.sessionsLabel")}</dt>
                    <dd>
                      {t("study.metricPeriodSessions", {
                        count: studyMetricPeriodSummary.sessionCount
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("progress.reviewsLabel")}</dt>
                    <dd>
                      {t("study.metricPeriodReviews", {
                        count: studyMetricPeriodSummary.reviewCount
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("study.easy")}</dt>
                    <dd>
                      {t("study.metricPeriodEasy", {
                        count: studyMetricPeriodSummary.easyCount
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("study.hard")}</dt>
                    <dd>
                      {t("study.metricPeriodDifficult", {
                        count: studyMetricPeriodSummary.difficultCount
                      })}
                    </dd>
                  </div>
                </dl>
              </section>
            ) : null}
            <section className="study-goal" aria-labelledby="study-goal-title">
              <div className="study-goal-header">
                <h3 id="study-goal-title">{t("study.goalTitle")}</h3>
                <label htmlFor="study-review-goal">{t("study.goalInputLabel")}</label>
                <input
                  id="study-review-goal"
                  type="number"
                  min="1"
                  value={activeStudyReviewGoalInput}
                  onChange={(event) => handleStudyGoalInputChange(event.target.value)}
                />
                <label htmlFor="study-review-goal-recurrence">
                  {t("study.goalRecurrenceLabel")}
                </label>
                <select
                  id="study-review-goal-recurrence"
                  value={activeStudyReviewGoalRecurrence}
                  onChange={(event) =>
                    handleStudyGoalRecurrenceChange(event.target.value as StudyGoalRecurrence)
                  }
                >
                  <option value="all">{t("study.goalRecurrenceAll")}</option>
                  <option value="daily">{t("study.goalRecurrenceDaily")}</option>
                  <option value="weekly">{t("study.goalRecurrenceWeekly")}</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveStudyReviewGoal();
                  }}
                >
                  {t("study.saveGoal")}
                </button>
              </div>
              <label className="study-goal-toggle">
                <input
                  type="checkbox"
                  checked={isStudyGoalNotificationEnabled}
                  onChange={(event) => {
                    void handleStudyGoalNotificationChange(event.target.checked);
                  }}
                />
                {t("study.goalNotificationToggle")}
              </label>
              <label className="study-goal-reminder-time">
                {t("study.goalNotificationTimeLabel")}
                <input
                  type="time"
                  value={studyGoalReminderTime}
                  disabled={!isStudyGoalNotificationEnabled}
                  onChange={(event) => {
                    void handleStudyGoalReminderTimeChange(event.target.value);
                  }}
                />
              </label>
              {activeStudyGoalProgress ? (
                <div className="study-goal-progress">
                  <strong>
                    {t("study.goalProgress", {
                      completed: activeStudyGoalProgress.completedReviews,
                      target: activeStudyGoalProgress.targetReviews
                    })}
                  </strong>
                  <span>
                    {t("study.goalPercent", {
                      percent: activeStudyGoalProgress.percent
                    })}
                  </span>
                  {activeStudyGoalAlertKey ? (
                    <em role="status">
                      {t(activeStudyGoalAlertKey, {
                        count: activeStudyGoalProgress.remainingReviews
                      })}
                    </em>
                  ) : null}
                </div>
              ) : (
                <p>{t("study.goalEmpty")}</p>
              )}
            </section>
            {sessionTrend ? (
              <section className="session-trend" aria-labelledby="session-trend-title">
                <h3 id="session-trend-title">{t("study.sessionTrendTitle")}</h3>
                <div className={`session-trend-summary ${sessionTrend.status}`}>
                  <strong>
                    {sessionTrend.status === "improving"
                      ? t("study.sessionTrendImproving")
                      : sessionTrend.status === "declining"
                        ? t("study.sessionTrendDeclining")
                        : t("study.sessionTrendStable")}
                  </strong>
                  <span>
                    {t("study.sessionTrendRange", {
                      first: sessionTrend.firstRetentionPercent,
                      latest: sessionTrend.latestRetentionPercent
                    })}
                  </span>
                </div>
              </section>
            ) : null}
            {hardCardPeriodTrend ? (
              <section className="hard-card-trend" aria-labelledby="hard-card-trend-title">
                <h3 id="hard-card-trend-title">{t("study.hardCardTrendTitle")}</h3>
                <div className={`hard-card-trend-status ${hardCardPeriodTrend.status}`}>
                  <strong>
                    {hardCardPeriodTrend.status === "reduction"
                      ? t("study.hardCardTrendReduction")
                      : hardCardPeriodTrend.status === "increase"
                        ? t("study.hardCardTrendIncrease")
                        : t("study.hardCardTrendStable")}
                  </strong>
                </div>
                <ul>
                  {hardCardPeriodTrend.periods.map((period) => (
                    <li key={period.label}>
                      <span>{period.label}</span>
                      <strong>{t("study.hardCardTrendCount", { count: period.difficultCount })}</strong>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <StudySessionHistory
              summaries={studySessionSummaries}
              labels={{
                title: t("study.sessionHistoryTitle"),
                empty: t("study.sessionHistoryEmpty"),
                exportReport: t("study.exportSessionReport"),
                previewPdfReport: t("study.previewSessionPdfReport"),
                exportPdfReport: t("study.exportSessionPdfReport"),
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
              onPreviewPdfReport={handlePreviewPrintableStudySessionReport}
              onExportPdfReport={handleExportPrintableStudySessionReport}
            />
            {printableReportPreviewHtml ? (
              <section className="pdf-preview" aria-labelledby="pdf-preview-title">
                <h3 id="pdf-preview-title">{t("study.pdfPreviewTitle")}</h3>
                <iframe
                  title={t("study.pdfPreviewFrameTitle")}
                  srcDoc={printableReportPreviewHtml}
                />
              </section>
            ) : null}
          </DocumentSummary>
              </>
        ) : (
          <section className="empty-state" aria-label={t("library.emptyStateLabel")}>
            <p>{t("library.emptyState")}</p>
          </section>
        )}
          </section>
          ) : null}
        </div>
      </section>
      {shouldShowBackgroundGenerationPanel ? (
        <aside
          className="background-generation-panel"
          aria-label={t("library.cardGenerationBackgroundTitle")}
        >
          <div className="processing-spinner" aria-hidden="true" />
          <div>
            <h2>{t("library.cardGenerationBackgroundTitle")}</h2>
            <p>{activeOperationMessage}</p>
            {cardGenerationQueuePanel}
          </div>
          <button
            type="button"
            aria-label={t("library.cancelProcessing")}
            onClick={handleCancelOperation}
          >
            {t("library.cancelOperation")}
          </button>
        </aside>
      ) : null}
      {shouldShowBlockingOverlay ? (
        <div
          className="processing-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="processing-overlay-title"
        >
          <div className="processing-panel">
            <div className="processing-spinner" aria-hidden="true" />
            <div>
              <h2 id="processing-overlay-title">{t("library.operationOverlayTitle")}</h2>
              <p>{activeOperationMessage}</p>
              <span>{t("library.operationOverlayDetail")}</span>
              {cardGenerationQueuePanel}
            </div>
            <button
              type="button"
              aria-label={t("library.cancelProcessing")}
              onClick={handleCancelOperation}
            >
              {t("library.cancelOperation")}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function waitForUiPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestAnimationFrame !== "function") {
      setTimeout(resolve, 0);
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}
