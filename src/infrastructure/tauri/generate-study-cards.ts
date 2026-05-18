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
  onProgress?: (progress: GenerateStudyCardsProgress) => void;
  onChunkCards?: (
    cards: StudyCard[],
    progress: GenerateStudyCardsProgress
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
  const cards: StudyCard[] = [];

  for (const [index, chunk] of chunks.entries()) {
    throwIfAborted(options.signal);

    const progress = {
      current: index + 1,
      total: chunks.length
    };

    options.onProgress?.(progress);

    const response = await withTimeout(invoke<GenerateStudyCardsResponse>("generate_study_cards", {
      request: {
        chunks: [chunk],
        cards_per_chunk: 1,
        language: "Pt"
      } satisfies GenerateStudyCardsRequest
    }), timeoutMs);
    throwIfAborted(options.signal);

    const chunkCards = response.cards.map(toStudyCard);

    await options.onChunkCards?.(chunkCards, progress);
    cards.push(...chunkCards);
  }

  return cards;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error("Operacao cancelada.");
  }
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
