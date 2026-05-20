export type Language = "pt" | "en" | "es";

export interface DocumentChunk {
  id: string;
  bookId: string;
  documentId: string;
  position: number;
  content: string;
  tokenEstimate: number;
}

export interface StudyCard {
  id: string;
  bookId: string;
  chunkId: string;
  front: string;
  back: string;
  tags: string[];
  cardType?: "basic" | "multiple_choice";
  choices?: string[];
  correctChoiceIndex?: number | null;
  explanation?: string | null;
}

export interface FlashcardConfig {
  cardsPerChunk: number;
  language: Language;
}

export interface ModelAdapter {
  generateText(prompt: string): Promise<string>;
  createFlashcards(chunks: DocumentChunk[], config: FlashcardConfig): Promise<StudyCard[]>;
}
