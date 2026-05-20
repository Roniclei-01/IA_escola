import { invoke } from "@tauri-apps/api/core";
import type { StudyCard } from "../../domain/model-adapter";

export interface PersistedStudyCard {
  id: string;
  book_id: string;
  chunk_id: string;
  front: string;
  back: string;
  tags: string[];
  card_type?: "basic" | "multiple_choice";
  choices?: string[];
  correct_choice_index?: number | null;
  explanation?: string | null;
}

export interface SaveStudyCardsResponse {
  cards: PersistedStudyCard[];
}

export interface ListStudyCardsResponse {
  cards: PersistedStudyCard[];
}

export interface DeleteStudyCardsResponse {
  document_id: string;
  deleted_cards: number;
}

export function toPersistedStudyCard(card: StudyCard): PersistedStudyCard {
  const persistedCard: PersistedStudyCard = {
    id: card.id,
    book_id: card.bookId,
    chunk_id: card.chunkId,
    front: card.front,
    back: card.back,
    tags: card.tags
  };

  if (card.cardType) {
    persistedCard.card_type = card.cardType;
  }

  if (card.choices) {
    persistedCard.choices = card.choices;
  }

  if (card.correctChoiceIndex !== undefined) {
    persistedCard.correct_choice_index = card.correctChoiceIndex;
  }

  if (card.explanation !== undefined) {
    persistedCard.explanation = card.explanation;
  }

  return persistedCard;
}

export function toStudyCard(card: PersistedStudyCard): StudyCard {
  const studyCard: StudyCard = {
    id: card.id,
    bookId: card.book_id,
    chunkId: card.chunk_id,
    front: card.front,
    back: card.back,
    tags: card.tags
  };

  if (card.card_type) {
    studyCard.cardType = card.card_type;
  }

  if (card.choices) {
    studyCard.choices = card.choices;
  }

  if (card.correct_choice_index !== undefined) {
    studyCard.correctChoiceIndex = card.correct_choice_index;
  }

  if (card.explanation !== undefined) {
    studyCard.explanation = card.explanation;
  }

  return studyCard;
}

export async function saveStudyCards(cards: StudyCard[]): Promise<StudyCard[]> {
  const response = await invoke<SaveStudyCardsResponse>("save_study_cards", {
    cards: cards.map(toPersistedStudyCard)
  });

  return response.cards.map(toStudyCard);
}

export async function listStudyCards(documentId: string): Promise<StudyCard[]> {
  const response = await invoke<ListStudyCardsResponse>("list_study_cards", {
    documentId
  });

  return response.cards.map(toStudyCard);
}

export async function deleteStudyCards(documentId: string): Promise<DeleteStudyCardsResponse> {
  return invoke<DeleteStudyCardsResponse>("delete_study_cards", {
    documentId
  });
}
