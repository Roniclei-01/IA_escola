import { invoke } from "@tauri-apps/api/core";
import type { StudyCard } from "../../domain/model-adapter";
import type { ImportedDocumentChunk } from "./chunk-text-document";
import { toStudyCard, type PersistedStudyCard } from "./study-cards";

export interface GenerateStudyCardsRequest {
  chunks: ImportedDocumentChunk[];
  cards_per_chunk: number;
  language: "Pt" | "En" | "Es";
}

export interface GenerateStudyCardsResponse {
  cards: PersistedStudyCard[];
}

export async function generateStudyCardsWithOllama(
  chunks: ImportedDocumentChunk[]
): Promise<StudyCard[]> {
  if (chunks.length === 0) {
    return [];
  }

  const response = await invoke<GenerateStudyCardsResponse>("generate_study_cards", {
    request: {
      chunks,
      cards_per_chunk: 1,
      language: "Pt"
    } satisfies GenerateStudyCardsRequest
  });

  return response.cards.map(toStudyCard);
}
