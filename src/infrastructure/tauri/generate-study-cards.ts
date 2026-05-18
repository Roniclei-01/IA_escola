import { invoke } from "@tauri-apps/api/core";
import type { StudyCard } from "../../domain/model-adapter";
import type { ImportedDocumentChunk } from "./chunk-text-document";
import { toStudyCard, type PersistedStudyCard } from "./study-cards";

const DEFAULT_CARD_GENERATION_TIMEOUT_MS = 60000;
const CARD_GENERATION_TIMEOUT_MESSAGE =
  "A geracao de cards demorou demais. Tente gerar menos cards ou usar um modelo menor.";

export interface GenerateStudyCardsRequest {
  chunks: ImportedDocumentChunk[];
  cards_per_chunk: number;
  language: "Pt" | "En" | "Es";
}

export interface GenerateStudyCardsResponse {
  cards: PersistedStudyCard[];
}

export async function generateStudyCardsWithOllama(
  chunks: ImportedDocumentChunk[],
  options: { timeoutMs?: number } = {}
): Promise<StudyCard[]> {
  if (chunks.length === 0) {
    return [];
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_CARD_GENERATION_TIMEOUT_MS;
  const response = await withTimeout(invoke<GenerateStudyCardsResponse>("generate_study_cards", {
    request: {
      chunks,
      cards_per_chunk: 1,
      language: "Pt"
    } satisfies GenerateStudyCardsRequest
  }), timeoutMs);

  return response.cards.map(toStudyCard);
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
