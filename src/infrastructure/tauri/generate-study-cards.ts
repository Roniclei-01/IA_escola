import { invoke } from "@tauri-apps/api/core";
import type { StudyCard } from "../../domain/model-adapter";
import type { ImportedDocumentChunk } from "./chunk-text-document";
import { toStudyCard, type PersistedStudyCard } from "./study-cards";

const DEFAULT_CARD_GENERATION_TIMEOUT_MS = 180000;
const CARD_GENERATION_TIMEOUT_MESSAGE =
  "A geracao de cards demorou demais. Tente novamente ou use um trecho menor.";

export interface GenerateStudyCardsRequest {
  chunks: ImportedDocumentChunk[];
  cards_per_chunk: number;
  language: "Pt" | "En" | "Es";
}

export interface GenerateStudyCardsResponse {
  cards: PersistedStudyCard[];
}

export interface GenerateStudyCardsProgress {
  current: number;
  total: number;
}

export interface GenerateStudyCardsOptions {
  timeoutMs?: number;
  maxChunkRetries?: number;
  onProgress?: (progress: GenerateStudyCardsProgress) => void;
  onChunkCards?: (
    cards: StudyCard[],
    progress: GenerateStudyCardsProgress
  ) => void | Promise<void>;
  onChunkError?: (
    chunk: ImportedDocumentChunk,
    progress: GenerateStudyCardsProgress,
    error: unknown
  ) => void | Promise<void>;
  signal?: AbortSignal;
}

export async function generateStudyCardsWithOllama(
  chunks: ImportedDocumentChunk[],
  options: GenerateStudyCardsOptions = {}
): Promise<StudyCard[]> {
  if (chunks.length === 0) {
    return [];
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_CARD_GENERATION_TIMEOUT_MS;
  const maxChunkRetries = options.maxChunkRetries ?? 1;
  const cards: StudyCard[] = [];
  let lastChunkError: unknown = null;

  for (const [index, chunk] of chunks.entries()) {
    throwIfAborted(options.signal);

    const progress = {
      current: index + 1,
      total: chunks.length
    };

    options.onProgress?.(progress);

    let chunkCards: StudyCard[] | null = null;

    for (let attempt = 0; attempt <= maxChunkRetries; attempt += 1) {
      try {
        const response = await withTimeout(invoke<GenerateStudyCardsResponse>("generate_study_cards", {
          request: {
            chunks: [chunk],
            cards_per_chunk: 1,
            language: "Pt"
          } satisfies GenerateStudyCardsRequest
        }), timeoutMs);
        throwIfAborted(options.signal);
        chunkCards = response.cards.map(toStudyCard);
        break;
      } catch (error) {
        throwIfAborted(options.signal);
        lastChunkError = error;

        if (isTimeoutError(error) || attempt >= maxChunkRetries) {
          break;
        }
      }
    }

    if (chunkCards === null) {
      await options.onChunkError?.(chunk, progress, lastChunkError);
      continue;
    }

    await options.onChunkCards?.(chunkCards, progress);
    cards.push(...chunkCards);
  }

  if (cards.length === 0 && lastChunkError) {
    throw lastChunkError;
  }

  return cards;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error("Operacao cancelada.");
  }
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === CARD_GENERATION_TIMEOUT_MESSAGE;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(CARD_GENERATION_TIMEOUT_MESSAGE));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
