import { useTranslation } from "react-i18next";
import { FormEvent, useEffect, useState } from "react";
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
import {
  loadStudyGoal as defaultLoadStudyGoal,
  saveStudyGoal as defaultSaveStudyGoal,
  type StudyGoal
} from "../infrastructure/tauri/study-goals";
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
  testOcrDependencies as defaultTestOcrDependencies,
  type OcrDependencies
} from "../infrastructure/tauri/ocr-dependencies";
import { ImportPanel } from "./components/ImportPanel";
import { DocumentSummary } from "./components/DocumentSummary";
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
  loadStudyGoal?: (documentId: string) => Promise<StudyGoal | null>;
  saveStudyGoal?: (
    documentId: string,
    targetReviews: number,
    recurrence: StudyGoalRecurrence
  ) => Promise<StudyGoal>;
  selectStudyFile?: () => Promise<string | null>;
  testOllamaConnection?: (request: {
    model: string;
    base_url?: string;
  }) => Promise<TestOllamaConnectionResponse>;
  loadOllamaSettings?: () => Promise<OllamaSettings>;
  saveOllamaSettings?: (settings: OllamaSettings) => Promise<OllamaSettings>;
  testOcrDependencies?: () => Promise<OcrDependencies>;
  downloadTextFile?: (fileName: string, content: string) => void;
  printStudySessionReport?: (fileName: string, html: string) => void;
  notifyStudyGoalReminder?: (notification: { title: string; body: string }) => Promise<void> | void;
  confirmDelete?: (message: string) => boolean;
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
type MetricPeriodFilter = "all" | "last7" | "last30";
type StudyGoalRecurrence = StudyGoal["recurrence"];

async function defaultNotifyStudyGoalReminder(notification: {
  title: string;
  body: string;
}): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  const notificationApi = window.Notification;
  let permission = notificationApi.permission;

  if (permission === "default") {
    permission = await notificationApi.requestPermission();
  }

  if (permission === "granted") {
    new notificationApi(notification.title, { body: notification.body });
  }
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

function defaultDownloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function defaultPrintStudySessionReport(fileName: string, html: string) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!printWindow) {
    defaultDownloadTextFile(fileName.replace(/\.pdf$/, ".html"), html);
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

function buildAnkiTsv(cards: StudyCard[], document: ImportTextBookResponse): string {
  const documentTag = toAnkiTag(`document_${document.document_id}`);
  const sourceTypeTag = toAnkiTag(`source_${document.source_type ?? "txt"}`);
  const headers = ["#separator:tab", "#html:false", "#notetype:Basic", "#columns:Front Back Tags"];
  const rows = cards.map((card) =>
    [
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
  deleteImportedDocument = defaultDeleteImportedDocument,
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
  loadStudyGoal = defaultLoadStudyGoal,
  saveStudyGoal = defaultSaveStudyGoal,
  selectStudyFile = defaultSelectStudyFile,
  testOllamaConnection = defaultTestOllamaConnection,
  loadOllamaSettings = defaultLoadOllamaSettings,
  saveOllamaSettings = defaultSaveOllamaSettings,
  testOcrDependencies = defaultTestOcrDependencies,
  downloadTextFile = defaultDownloadTextFile,
  printStudySessionReport = defaultPrintStudySessionReport,
  notifyStudyGoalReminder = defaultNotifyStudyGoalReminder,
  confirmDelete = (message: string) => window.confirm(message),
  enableDevelopmentFallback = import.meta.env.DEV
}: AppProps) {
  const { t } = useTranslation();
  const [filePath, setFilePath] = useState("");
  const [isOcrEnabled, setIsOcrEnabled] = useState(false);
  const [ocrLanguage, setOcrLanguage] = useState<"por" | "eng" | "spa">("por");
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
  const [documentSessionSummariesById, setDocumentSessionSummariesById] = useState<
    Record<string, StudySessionSummary[]>
  >({});
  const [documentProgressSummaries, setDocumentProgressSummaries] = useState<
    DocumentProgressSummary[]
  >([]);
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
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://127.0.0.1:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const [isTestingOllama, setIsTestingOllama] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<string | null>(null);
  const [ocrDependencies, setOcrDependencies] = useState<OcrDependencies | null>(null);
  const [isLoadingOcrDependencies, setIsLoadingOcrDependencies] = useState(true);

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
        const summariesByDocument = Object.fromEntries(sessionSummaryEntries);

        if (isCurrent) {
          setSavedDocuments(response.documents);
          setDocumentReviewCounts(Object.fromEntries(reviewCountEntries));
          setDocumentSessionSummariesById(summariesByDocument);
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
  }, [listImportedDocuments, listStudyReviews, listStudySessionSummaries, t]);

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
    setPrintableReportPreviewHtml(null);
    setCardReviewSchedules({});

    try {
      const importedDocument = await importTextBook(trimmedPath, {
        ocrEnabled: isOcrEnabled,
        ocrLanguage
      });
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
      setDocumentSessionSummariesById((currentSummariesByDocument) => ({
        ...currentSummariesByDocument,
        [importedDocument.document_id]: []
      }));
      setDocumentProgressSummaries(
        buildDocumentProgressSummaries([...savedDocuments, importedDocument], {
          ...documentSessionSummariesById,
          [importedDocument.document_id]: []
        })
      );
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
      const persistedStudyGoal = await loadStudyGoal(selectedDocument.document_id);
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
      setError(unknownError instanceof Error ? unknownError.message : t("library.restoreError"));
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
      setError(unknownError instanceof Error ? unknownError.message : t("library.deleteError"));
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

      if (savedGoalProgress && savedGoalAlertKey) {
        await notifyStudyGoalReminder({
          title: t("study.goalNotificationTitle"),
          body: t(savedGoalAlertKey, {
            count: savedGoalProgress.remainingReviews
          })
        });
      }
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : t("study.goalSaveError"));
    }
  }

  function handleExportStudySessionReport() {
    if (!document || studySessionSummaries.length === 0) {
      return;
    }

    const fileName = `relatorio-estudo-${sanitizeReportFileName(document.document_id)}.md`;
    downloadTextFile(fileName, buildStudySessionReport(document, studySessionSummaries));
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

  function handleExportAnkiDeck() {
    if (!document || cards.length === 0) {
      return;
    }

    const fileName = `anki-${sanitizeReportFileName(document.document_id)}.tsv`;
    downloadTextFile(fileName, buildAnkiTsv(cards, document));
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

        {documentProgressSummaries.length > 0 ? (
          <section className="progress-comparison" aria-labelledby="progress-comparison-title">
            <h2 id="progress-comparison-title">{t("progress.title")}</h2>
            <ul>
              {documentProgressSummaries.map((summary) => (
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
            <div className="document-actions">
              <button type="button" onClick={handleExportAnkiDeck}>
                {t("study.exportAnki")}
              </button>
            </div>
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
        ) : (
          <section className="empty-state" aria-label={t("library.emptyStateLabel")}>
            <p>{t("library.emptyState")}</p>
          </section>
        )}
      </section>
    </main>
  );
}
