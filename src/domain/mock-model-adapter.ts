import type { DocumentChunk, FlashcardConfig, ModelAdapter, StudyCard } from "./model-adapter";

export class MockModelAdapter implements ModelAdapter {
  private shouldFail = false;

  failNextCall() {
    this.shouldFail = true;
  }

  async generateText(prompt: string): Promise<string> {
    if (this.shouldFail) {
      this.shouldFail = false;
      throw new Error("model is unavailable");
    }

    return prompt;
  }

  async createFlashcards(chunks: DocumentChunk[], config: FlashcardConfig): Promise<StudyCard[]> {
    if (this.shouldFail) {
      this.shouldFail = false;
      throw new Error("model is unavailable");
    }

    return chunks.flatMap((chunk) =>
      Array.from({ length: config.cardsPerChunk }, (_, index) => ({
        id: `${chunk.id}-card-${index + 1}`,
        bookId: chunk.bookId,
        chunkId: chunk.id,
        front: `Pergunta ${index + 1} sobre o trecho ${chunk.position}`,
        back: `Resposta baseada em: ${chunk.content}`,
        tags: ["mock", config.language]
      }))
    );
  }
}
