import type { ImportedDocumentChunk } from "../infrastructure/tauri/chunk-text-document";
import type { DocumentChunk, Language, ModelAdapter, StudyCard } from "../domain/model-adapter";

export interface GenerateStudyCardsConfig {
  cardsPerChunk: number;
  language: Language;
}

export function mapImportedChunk(chunk: ImportedDocumentChunk): DocumentChunk {
  return {
    id: chunk.id,
    bookId: chunk.book_id,
    documentId: chunk.document_id,
    position: chunk.position,
    content: chunk.content,
    tokenEstimate: chunk.token_estimate
  };
}

export async function generateStudyCards(
  chunks: ImportedDocumentChunk[],
  config: GenerateStudyCardsConfig,
  adapter: ModelAdapter
): Promise<StudyCard[]> {
  if (chunks.length === 0) {
    return [];
  }

  if (config.cardsPerChunk <= 0) {
    throw new Error("cards per chunk must be greater than zero");
  }

  return adapter.createFlashcards(chunks.map(mapImportedChunk), config);
}
