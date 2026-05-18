import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import "../i18n";

describe("App", () => {
  it("renders the product name", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Estudo IA Local" })).toBeInTheDocument();
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

    render(<App importTextBook={importTextBook} chunkTextDocument={chunkTextDocument} />);

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
    expect(screen.getByText("Conteudo importado para estudo.")).toBeInTheDocument();
    expect(screen.getByText("1 chunk gerado")).toBeInTheDocument();
    expect(await screen.findByText("1 card gerado")).toBeInTheDocument();
    expect(screen.getByText("Pergunta 1 sobre o trecho 0")).toBeInTheDocument();
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

    render(
      <App
        importTextBook={importTextBook}
        chunkTextDocument={chunkTextDocument}
        generateCards={generateCards}
      />
    );

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

    render(<App importTextBook={importTextBook} />);

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

    render(<App importTextBook={importTextBook} chunkTextDocument={chunkTextDocument} />);

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

    render(
      <App
        importTextBook={importTextBook}
        chunkTextDocument={chunkTextDocument}
        generateCards={generateCards}
      />
    );

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt"), {
      target: { value: "/tmp/book.txt" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao gerar cards.");
  });
});
