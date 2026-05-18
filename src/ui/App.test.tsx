import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { StudyCard } from "../domain/model-adapter";
import { App } from "./App";
import "../i18n";

const listNoDocuments = vi.fn().mockResolvedValue({ documents: [] });
const listNoStudyCards = vi.fn().mockResolvedValue([]);
const saveCards = vi.fn().mockImplementation(async (cards: unknown[]) => cards);
const loadDefaultOllamaSettings = vi.fn().mockResolvedValue({
  base_url: "http://127.0.0.1:11434",
  model: "llama3.2"
});
const saveOllamaSettings = vi.fn().mockImplementation(async (settings: unknown) => settings);

function renderApp(props: ComponentProps<typeof App> = {}) {
  return render(
    <App
      listImportedDocuments={listNoDocuments}
      loadOllamaSettings={loadDefaultOllamaSettings}
      saveOllamaSettings={saveOllamaSettings}
      {...props}
    />
  );
}

describe("App", () => {
  it("renders the product name", async () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "Estudo IA Local" })).toBeInTheDocument();
    expect(await screen.findByText("Nenhum documento salvo ainda.")).toBeInTheDocument();
  });

  it("loads saved documents on startup", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-saved",
          book_id: "book-saved",
          content: "Documento salvo anteriormente.",
          language: "Pt"
        }
      ]
    });

    renderApp({ listImportedDocuments });

    expect(listImportedDocuments).toHaveBeenCalled();
    expect(await screen.findByText("Documentos salvos")).toBeInTheDocument();
    expect(screen.getByText("Documento salvo anteriormente.")).toBeInTheDocument();
  });

  it("tests the Ollama connection from settings", async () => {
    const testOllamaConnection = vi.fn().mockResolvedValue({
      ok: true,
      model: "mistral",
      response: "ok"
    });

    renderApp({ testOllamaConnection });

    fireEvent.change(screen.getByLabelText("URL local do Ollama"), {
      target: { value: "http://127.0.0.1:11434" }
    });
    fireEvent.change(screen.getByLabelText("Modelo"), {
      target: { value: "mistral" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Testar" }));

    await waitFor(() => {
      expect(testOllamaConnection).toHaveBeenCalledWith({
        model: "mistral",
        base_url: "http://127.0.0.1:11434"
      });
    });
    expect(saveOllamaSettings).toHaveBeenCalledWith({
      model: "mistral",
      base_url: "http://127.0.0.1:11434"
    });
    expect(await screen.findByText("Ollama conectado com o modelo mistral.")).toBeInTheDocument();
  });

  it("loads persisted Ollama settings on startup", async () => {
    const loadOllamaSettings = vi.fn().mockResolvedValue({
      base_url: "http://127.0.0.1:11435",
      model: "mistral"
    });

    renderApp({ loadOllamaSettings });

    expect(await screen.findByDisplayValue("http://127.0.0.1:11435")).toBeInTheDocument();
    expect(screen.getByDisplayValue("mistral")).toBeInTheDocument();
  });

  it("shows an error when the Ollama connection test fails", async () => {
    const testOllamaConnection = vi
      .fn()
      .mockRejectedValue(new Error("Nao foi possivel conectar ao Ollama."));

    renderApp({ testOllamaConnection });

    fireEvent.click(screen.getByRole("button", { name: "Testar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nao foi possivel conectar ao Ollama."
    );
  });

  it("loads persisted chunks when selecting a saved document", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-saved",
          book_id: "book-saved",
          content: "Documento salvo anteriormente.",
          language: "Pt"
        }
      ]
    });
    const listDocumentChunks = vi.fn().mockResolvedValue({
      chunks: [
        {
          id: "chunk-saved",
          book_id: "book-saved",
          document_id: "document-saved",
          position: 1,
          content: "Chunk persistido.",
          token_estimate: 2
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([]);
    const generateCards = vi.fn().mockResolvedValue([
      {
        id: "card-saved",
        bookId: "book-saved",
        chunkId: "chunk-saved",
        front: "Pergunta salva",
        back: "Resposta salva",
        tags: ["saved"]
      }
    ]);

    renderApp({
      listImportedDocuments,
      listDocumentChunks,
      listStudyCards,
      saveStudyCards: saveCards,
      generateCards
    });

    fireEvent.click(await screen.findByRole("button", { name: /Documento 1/ }));

    await waitFor(() => {
      expect(listDocumentChunks).toHaveBeenCalledWith("document-saved");
    });
    expect(generateCards).toHaveBeenCalledWith([
      {
        id: "chunk-saved",
        book_id: "book-saved",
        document_id: "document-saved",
        position: 1,
        content: "Chunk persistido.",
        token_estimate: 2
      }
    ]);
    expect(await screen.findByText("1 chunk gerado")).toBeInTheDocument();
    expect(screen.getByText("1 card gerado")).toBeInTheDocument();
    expect(screen.getByText("Pergunta salva")).toBeInTheDocument();
  });

  it("uses persisted cards when selecting a saved document", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-saved",
          book_id: "book-saved",
          content: "Documento salvo anteriormente.",
          language: "Pt"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([
      {
        id: "card-saved",
        bookId: "book-saved",
        chunkId: "chunk-saved",
        front: "Pergunta persistida",
        back: "Resposta persistida",
        tags: ["saved"]
      }
    ]);
    const listDocumentChunks = vi.fn().mockResolvedValue({ chunks: [] });
    const generateCards = vi.fn().mockResolvedValue([]);

    renderApp({
      listImportedDocuments,
      listDocumentChunks,
      listStudyCards,
      generateCards
    });

    fireEvent.click(await screen.findByRole("button", { name: /Documento 1/ }));

    await waitFor(() => {
      expect(listStudyCards).toHaveBeenCalledWith("document-saved");
    });
    expect(listDocumentChunks).not.toHaveBeenCalled();
    expect(generateCards).not.toHaveBeenCalled();
    expect(await screen.findByText("Pergunta persistida")).toBeInTheDocument();
    expect(screen.getByText("1 card gerado")).toBeInTheDocument();
  });

  it("imports a text book from a file path", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-1",
      book_id: "book-1",
      content: "Conteudo importado para estudo.",
      language: "Pt"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({
      chunks: [
        {
          id: "chunk-1",
          book_id: "book-1",
          document_id: "document-1",
          position: 0,
          content: "Conteudo importado para estudo.",
          token_estimate: 4
        }
      ]
    });
    const generateCards = vi.fn().mockResolvedValue([
      {
        id: "chunk-1-card-1",
        bookId: "book-1",
        chunkId: "chunk-1",
        front: "Pergunta 1 sobre o trecho 0",
        back: "Resposta baseada em: Conteudo importado para estudo.",
        tags: ["mock"]
      }
    ]);

    renderApp({
      importTextBook,
      chunkTextDocument,
      generateCards,
      saveStudyCards: saveCards,
      enableDevelopmentFallback: false
    });

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt"), {
      target: { value: "/tmp/book.txt" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    await waitFor(() => {
      expect(importTextBook).toHaveBeenCalledWith("/tmp/book.txt");
    });
    expect(chunkTextDocument).toHaveBeenCalledWith({
      document_id: "document-1",
      book_id: "book-1",
      content: "Conteudo importado para estudo.",
      language: "Pt",
      max_words_per_chunk: 180
    });
    expect(await screen.findByText("Documento importado")).toBeInTheDocument();
    expect(screen.getAllByText("Conteudo importado para estudo.").length).toBeGreaterThan(0);
    expect(screen.getByText("1 chunk gerado")).toBeInTheDocument();
    expect(await screen.findByText("1 card gerado")).toBeInTheDocument();
    expect(screen.getByText("Pergunta 1 sobre o trecho 0")).toBeInTheDocument();
    expect(screen.getAllByText("Conteudo importado para estudo.").length).toBeGreaterThan(0);
  });

  it("shows progress while Ollama generates cards", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-1",
      book_id: "book-1",
      content: "Conteudo importado para estudo.",
      language: "Pt"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({
      chunks: [
        {
          id: "chunk-1",
          book_id: "book-1",
          document_id: "document-1",
          position: 0,
          content: "Conteudo importado para estudo.",
          token_estimate: 4
        }
      ]
    });
    let resolveCards: (cards: Array<{
      id: string;
      bookId: string;
      chunkId: string;
      front: string;
      back: string;
      tags: string[];
    }>) => void = () => {};
    const generateCards = vi.fn(
      () =>
        new Promise<StudyCard[]>((resolve) => {
          resolveCards = resolve;
        })
    );

    renderApp({
      importTextBook,
      chunkTextDocument,
      generateCards,
      saveStudyCards: saveCards,
      enableDevelopmentFallback: false
    });

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt"), {
      target: { value: "/tmp/book.txt" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Gerando cards com Ollama.");

    resolveCards([
      {
        id: "card-1",
        bookId: "book-1",
        chunkId: "chunk-1",
        front: "Pergunta gerada",
        back: "Resposta gerada",
        tags: ["ollama"]
      }
    ]);

    expect(await screen.findByText("Pergunta gerada")).toBeInTheDocument();
  });

  it("uses mock cards as a development fallback when Ollama generation fails", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-1",
      book_id: "book-1",
      content: "Conteudo importado para estudo.",
      language: "Pt"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({
      chunks: [
        {
          id: "chunk-1",
          book_id: "book-1",
          document_id: "document-1",
          position: 0,
          content: "Conteudo importado para estudo.",
          token_estimate: 4
        }
      ]
    });
    const generateCards = vi.fn().mockRejectedValue(new Error("Ollama indisponivel."));
    const saveStudyCards = vi.fn().mockImplementation(async (cards: StudyCard[]) => cards);

    renderApp({
      importTextBook,
      chunkTextDocument,
      generateCards,
      saveStudyCards,
      enableDevelopmentFallback: true
    });

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt"), {
      target: { value: "/tmp/book.txt" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ollama falhou. Cards mockados foram gerados apenas para desenvolvimento."
    );
    expect(await screen.findByText("Pergunta 1 sobre o trecho 0")).toBeInTheDocument();
    expect(saveStudyCards).toHaveBeenCalledWith([
      {
        id: "chunk-1-card-1",
        bookId: "book-1",
        chunkId: "chunk-1",
        front: "Pergunta 1 sobre o trecho 0",
        back: "Resposta baseada em: Conteudo importado para estudo.",
        tags: ["mock", "pt"]
      }
    ]);
  });

  it("reveals the answer and advances through study cards", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-1",
      book_id: "book-1",
      content: "Conteudo importado para estudo.",
      language: "Pt"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({
      chunks: [
        {
          id: "chunk-1",
          book_id: "book-1",
          document_id: "document-1",
          position: 0,
          content: "Primeiro chunk.",
          token_estimate: 2
        },
        {
          id: "chunk-2",
          book_id: "book-1",
          document_id: "document-1",
          position: 1,
          content: "Segundo chunk.",
          token_estimate: 2
        }
      ]
    });
    const generateCards = vi.fn().mockResolvedValue([
      {
        id: "card-1",
        bookId: "book-1",
        chunkId: "chunk-1",
        front: "Pergunta 1",
        back: "Resposta 1",
        tags: ["mock"]
      },
      {
        id: "card-2",
        bookId: "book-1",
        chunkId: "chunk-2",
        front: "Pergunta 2",
        back: "Resposta 2",
        tags: ["mock"]
      }
    ]);

    renderApp({
      importTextBook,
      chunkTextDocument,
      generateCards,
      saveStudyCards: saveCards,
      enableDevelopmentFallback: false
    });

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt"), {
      target: { value: "/tmp/book.txt" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByText("Pergunta 1")).toBeInTheDocument();
    expect(screen.queryByText("Resposta 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Revelar resposta" }));

    expect(screen.getByText("Resposta 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Proximo card" }));

    expect(screen.getByText("Pergunta 2")).toBeInTheDocument();
    expect(screen.queryByText("Resposta 1")).not.toBeInTheDocument();
    expect(screen.getByText("Card 2 de 2")).toBeInTheDocument();
  });

  it("shows an error when import fails", async () => {
    const importTextBook = vi.fn().mockRejectedValue(new Error("Arquivo de texto nao encontrado."));

    renderApp({
      importTextBook,
      listStudyCards: listNoStudyCards
    });

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt"), {
      target: { value: "/tmp/missing.txt" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Arquivo de texto nao encontrado.");
  });

  it("shows chunking errors after a successful import", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-1",
      book_id: "book-1",
      content: "Conteudo importado para estudo.",
      language: "Pt"
    });
    const chunkTextDocument = vi.fn().mockRejectedValue(new Error("Falha ao gerar chunks."));

    renderApp({
      importTextBook,
      chunkTextDocument,
      saveStudyCards: saveCards
    });

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt"), {
      target: { value: "/tmp/book.txt" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao gerar chunks.");
  });

  it("shows card generation errors after chunking", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-1",
      book_id: "book-1",
      content: "Conteudo importado para estudo.",
      language: "Pt"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({
      chunks: [
        {
          id: "chunk-1",
          book_id: "book-1",
          document_id: "document-1",
          position: 0,
          content: "Conteudo importado para estudo.",
          token_estimate: 4
        }
      ]
    });
    const generateCards = vi.fn().mockRejectedValue(new Error("Falha ao gerar cards."));

    renderApp({
      importTextBook,
      chunkTextDocument,
      generateCards,
      saveStudyCards: saveCards,
      enableDevelopmentFallback: false
    });

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt"), {
      target: { value: "/tmp/book.txt" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao gerar cards.");
  });
});
