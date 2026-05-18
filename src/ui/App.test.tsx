import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { StudyCard } from "../domain/model-adapter";
import { App } from "./App";
import "../i18n";

const listNoDocuments = vi.fn().mockResolvedValue({ documents: [] });
const listNoArchivedDocuments = vi.fn().mockResolvedValue({ documents: [] });
const listNoStudyCards = vi.fn().mockResolvedValue([]);
const listNoStudyReviews = vi.fn().mockResolvedValue([]);
const listNoStudySessionSummaries = vi.fn().mockResolvedValue([]);
const saveStudyReview = vi.fn().mockResolvedValue({
  id: "review-1",
  card_id: "card-1",
  session_id: "session-1",
  rating: "easy",
  priority: 20,
  next_review_at: 1700604800
});
const startStudySession = vi.fn().mockResolvedValue({
  id: "session-1",
  document_id: "document-1",
  started_at: 1700000000
});
const selectNoFile = vi.fn().mockResolvedValue(null);
const saveCards = vi.fn().mockImplementation(async (cards: unknown[]) => cards);
const loadDefaultOllamaSettings = vi.fn().mockResolvedValue({
  base_url: "http://127.0.0.1:11434",
  model: "llama3.2"
});
const saveOllamaSettings = vi.fn().mockImplementation(async (settings: unknown) => settings);
const testOcrDependencies = vi.fn().mockResolvedValue({
  pdftoppm_available: true,
  tesseract_available: true
});

function renderApp(props: ComponentProps<typeof App> = {}) {
  return render(
    <App
      listImportedDocuments={listNoDocuments}
      listArchivedDocuments={listNoArchivedDocuments}
      listStudyReviews={listNoStudyReviews}
      listStudySessionSummaries={listNoStudySessionSummaries}
      saveStudyReview={saveStudyReview}
      startStudySession={startStudySession}
      selectStudyFile={selectNoFile}
      loadOllamaSettings={loadDefaultOllamaSettings}
      saveOllamaSettings={saveOllamaSettings}
      testOcrDependencies={testOcrDependencies}
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

  it("shows comparative progress for saved documents", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-biology",
          book_id: "book-biology",
          content: "Biologia celular.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/biologia.txt"
        },
        {
          document_id: "document-history",
          book_id: "book-history",
          content: "Historia do Brasil.",
          language: "Pt",
          source_type: "pdf",
          source_path: "/tmp/historia.pdf"
        }
      ]
    });
    const listStudySessionSummaries = vi.fn().mockImplementation(async (documentId: string) => {
      if (documentId === "document-biology") {
        return [
          {
            session_id: "session-biology-1",
            document_id: "document-biology",
            started_at: 1700000000,
            again_count: 1,
            hard_count: 1,
            easy_count: 3
          },
          {
            session_id: "session-biology-2",
            document_id: "document-biology",
            started_at: 1700001000,
            again_count: 0,
            hard_count: 0,
            easy_count: 2
          }
        ];
      }

      return [
        {
          session_id: "session-history-1",
          document_id: "document-history",
          started_at: 1700002000,
          again_count: 2,
          hard_count: 0,
          easy_count: 0
        }
      ];
    });

    renderApp({ listImportedDocuments, listStudySessionSummaries });

    expect(await screen.findByText("Progresso por documento")).toBeInTheDocument();
    expect(screen.getAllByText("Biologia celular.")).toHaveLength(2);
    expect(screen.getByText("2 sessoes")).toBeInTheDocument();
    expect(screen.getByText("7 revisoes")).toBeInTheDocument();
    expect(screen.getByText("71% acertos")).toBeInTheDocument();
    expect(screen.getByText("Mais estudado")).toBeInTheDocument();
    expect(listStudySessionSummaries).toHaveBeenCalledWith("document-biology");
    expect(listStudySessionSummaries).toHaveBeenCalledWith("document-history");
  });

  it("filters saved documents by source type and review status", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-reviewed",
          book_id: "book-reviewed",
          content: "Documento PDF revisado.",
          language: "Pt",
          source_type: "pdf",
          source_path: "/tmp/revisado.pdf"
        },
        {
          document_id: "document-pending",
          book_id: "book-pending",
          content: "Documento TXT pendente.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/pendente.txt"
        }
      ]
    });
    const listStudyReviews = vi.fn().mockImplementation(async (documentId: string) => {
      if (documentId === "document-reviewed") {
        return [
          {
            id: "review-1",
            card_id: "card-1",
            session_id: "session-1",
            rating: "easy",
            priority: 20,
            next_review_at: 1700604800
          }
        ];
      }

      return [];
    });

    renderApp({ listImportedDocuments, listStudyReviews });

    expect(await screen.findByText("Documento PDF revisado.")).toBeInTheDocument();
    expect(screen.getByText("Documento TXT pendente.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Tipo de arquivo"), {
      target: { value: "pdf" }
    });

    expect(screen.getByText("Documento PDF revisado.")).toBeInTheDocument();
    expect(screen.queryByText("Documento TXT pendente.")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Status de revisao"), {
      target: { value: "pending" }
    });

    expect(screen.getByText("Nenhum documento corresponde aos filtros.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Tipo de arquivo"), {
      target: { value: "all" }
    });

    expect(screen.getByText("Documento TXT pendente.")).toBeInTheDocument();
    expect(screen.queryByText("Documento PDF revisado.")).not.toBeInTheDocument();
  });

  it("searches saved documents by content and source path", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-algebra",
          book_id: "book-algebra",
          content: "Apostila de algebra linear.",
          language: "Pt",
          source_type: "pdf",
          source_path: "/tmp/matematica/algebra.pdf"
        },
        {
          document_id: "document-history",
          book_id: "book-history",
          content: "Resumo de historia do Brasil.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/humanas/brasil.txt"
        }
      ]
    });

    renderApp({ listImportedDocuments });

    expect(await screen.findByText("Apostila de algebra linear.")).toBeInTheDocument();
    expect(screen.getByText("Resumo de historia do Brasil.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar na biblioteca"), {
      target: { value: "historia" }
    });

    expect(screen.queryByText("Apostila de algebra linear.")).not.toBeInTheDocument();
    expect(screen.getByText("Resumo de historia do Brasil.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar na biblioteca"), {
      target: { value: "ALGEBRA.PDF" }
    });

    expect(screen.getByText("Apostila de algebra linear.")).toBeInTheDocument();
    expect(screen.queryByText("Resumo de historia do Brasil.")).not.toBeInTheDocument();
  });

  it("sorts saved documents by date, source type and review status", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-old-reviewed",
          book_id: "book-old-reviewed",
          content: "Documento antigo revisado.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/antigo.txt"
        },
        {
          document_id: "document-new-pending",
          book_id: "book-new-pending",
          content: "Documento novo pendente.",
          language: "Pt",
          source_type: "pdf",
          source_path: "/tmp/novo.pdf"
        }
      ]
    });
    const listStudyReviews = vi.fn().mockImplementation(async (documentId: string) => {
      if (documentId === "document-old-reviewed") {
        return [
          {
            id: "review-1",
            card_id: "card-1",
            session_id: "session-1",
            rating: "easy",
            priority: 20,
            next_review_at: 1700604800
          }
        ];
      }

      return [];
    });

    renderApp({ listImportedDocuments, listStudyReviews });

    expect(await screen.findByText("Documento antigo revisado.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Ordenar biblioteca"), {
      target: { value: "newest" }
    });

    expect(screen.getAllByRole("button", { name: /Documento/ })[0]).toHaveTextContent(
      "Documento novo pendente."
    );

    fireEvent.change(screen.getByLabelText("Ordenar biblioteca"), {
      target: { value: "type" }
    });

    expect(screen.getAllByRole("button", { name: /Documento/ })[0]).toHaveTextContent(
      "Documento novo pendente."
    );

    fireEvent.change(screen.getByLabelText("Ordenar biblioteca"), {
      target: { value: "status" }
    });

    expect(screen.getAllByRole("button", { name: /Documento/ })[0]).toHaveTextContent(
      "Documento antigo revisado."
    );
  });

  it("archives a saved document from the active library", async () => {
    const archiveImportedDocument = vi.fn().mockResolvedValue({
      document_id: "document-archived"
    });
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-archived",
          book_id: "book-archived",
          content: "Documento que sera arquivado.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/arquivar.txt"
        }
      ]
    });

    renderApp({ archiveImportedDocument, listImportedDocuments });

    expect(await screen.findByText("Documento que sera arquivado.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Arquivar" }));

    await waitFor(() => {
      expect(archiveImportedDocument).toHaveBeenCalledWith("document-archived");
    });
    expect(screen.getByText("Nenhum documento salvo ainda.")).toBeInTheDocument();
    expect(screen.getByText("Documento que sera arquivado.")).toBeInTheDocument();
  });

  it("loads and restores archived documents", async () => {
    const restoreImportedDocument = vi.fn().mockResolvedValue({
      document_id: "document-restored"
    });
    const listArchivedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-restored",
          book_id: "book-restored",
          content: "Documento arquivado para restaurar.",
          language: "Pt",
          source_type: "pdf",
          source_path: "/tmp/restaurar.pdf"
        }
      ]
    });

    renderApp({ listArchivedDocuments, restoreImportedDocument });

    expect(await screen.findByText("Documentos arquivados")).toBeInTheDocument();
    expect(screen.getByText("Documento arquivado para restaurar.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));

    await waitFor(() => {
      expect(restoreImportedDocument).toHaveBeenCalledWith("document-restored");
    });
    expect(screen.queryByText("Nenhum documento salvo ainda.")).not.toBeInTheDocument();
    expect(screen.getByText("Documento arquivado para restaurar.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum documento arquivado.")).toBeInTheDocument();
  });

  it("deletes an archived document after confirmation", async () => {
    const confirmDelete = vi.fn().mockReturnValue(true);
    const deleteImportedDocument = vi.fn().mockResolvedValue({
      document_id: "document-delete"
    });
    const listArchivedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-delete",
          book_id: "book-delete",
          content: "Documento arquivado para excluir.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/excluir.txt"
        }
      ]
    });

    renderApp({
      confirmDelete,
      deleteImportedDocument,
      listArchivedDocuments
    });

    expect(await screen.findByText("Documento arquivado para excluir.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Excluir definitivamente" }));

    await waitFor(() => {
      expect(confirmDelete).toHaveBeenCalledWith(
        "Excluir definitivamente este documento e todos os dados de estudo relacionados?"
      );
      expect(deleteImportedDocument).toHaveBeenCalledWith("document-delete");
    });
    expect(screen.queryByText("Documento arquivado para excluir.")).not.toBeInTheDocument();
    expect(screen.getByText("Nenhum documento arquivado.")).toBeInTheDocument();
  });

  it("keeps an archived document when deletion is not confirmed", async () => {
    const confirmDelete = vi.fn().mockReturnValue(false);
    const deleteImportedDocument = vi.fn();
    const listArchivedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-keep",
          book_id: "book-keep",
          content: "Documento arquivado preservado.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/preservar.txt"
        }
      ]
    });

    renderApp({
      confirmDelete,
      deleteImportedDocument,
      listArchivedDocuments
    });

    expect(await screen.findByText("Documento arquivado preservado.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Excluir definitivamente" }));

    expect(deleteImportedDocument).not.toHaveBeenCalled();
    expect(screen.getByText("Documento arquivado preservado.")).toBeInTheDocument();
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

  it("shows missing OCR dependencies with installation guidance", async () => {
    const testOcrDependencies = vi.fn().mockResolvedValue({
      pdftoppm_available: true,
      tesseract_available: false
    });

    renderApp({ testOcrDependencies });

    expect(await screen.findByText("OCR local")).toBeInTheDocument();
    expect(screen.getByText("OCR indisponivel neste computador.")).toBeInTheDocument();
    expect(screen.getByText("pdftoppm disponivel")).toBeInTheDocument();
    expect(screen.getByText("tesseract ausente")).toBeInTheDocument();
    expect(
      screen.getByText("Ubuntu/Debian: sudo apt install poppler-utils tesseract-ocr tesseract-ocr-por")
    ).toBeInTheDocument();
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

  it("fills the file path from the native file picker", async () => {
    const selectStudyFile = vi.fn().mockResolvedValue("/tmp/book.pdf");

    renderApp({ selectStudyFile });

    fireEvent.click(screen.getByRole("button", { name: "Selecionar" }));

    expect(await screen.findByDisplayValue("/tmp/book.pdf")).toBeInTheDocument();
    expect(selectStudyFile).toHaveBeenCalled();
  });

  it("shows an error when the native file picker fails", async () => {
    const selectStudyFile = vi.fn().mockRejectedValue(new Error("dialog failed"));

    renderApp({ selectStudyFile });

    fireEvent.click(screen.getByRole("button", { name: "Selecionar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nao foi possivel abrir o seletor de arquivos."
    );
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
      },
      {
        id: "card-again",
        bookId: "book-saved",
        chunkId: "chunk-saved",
        front: "Pergunta atrasada",
        back: "Resposta atrasada",
        tags: ["saved"]
      },
      {
        id: "card-future",
        bookId: "book-saved",
        chunkId: "chunk-saved",
        front: "Pergunta futura",
        back: "Resposta futura",
        tags: ["saved"]
      }
    ]);
    const listDocumentChunks = vi.fn().mockResolvedValue({ chunks: [] });
    const generateCards = vi.fn().mockResolvedValue([]);
    const listStudyReviews = vi.fn().mockResolvedValue([
      {
        id: "review-1",
        card_id: "card-saved",
        session_id: "session-1",
        rating: "hard",
        priority: 70,
        next_review_at: 1700086400
      },
      {
        id: "review-2",
        card_id: "card-again",
        session_id: "session-1",
        rating: "again",
        priority: 100,
        next_review_at: 1700000000
      },
      {
        id: "review-3",
        card_id: "card-future",
        session_id: "session-1",
        rating: "easy",
        priority: 20,
        next_review_at: 4102444800
      }
    ]);

    renderApp({
      listImportedDocuments,
      listDocumentChunks,
      listStudyCards,
      generateCards,
      listStudyReviews
    });

    fireEvent.click(await screen.findByRole("button", { name: /Documento 1/ }));

    await waitFor(() => {
      expect(listStudyCards).toHaveBeenCalledWith("document-saved");
    });
    expect(listDocumentChunks).not.toHaveBeenCalled();
    expect(generateCards).not.toHaveBeenCalled();
    expect(listStudyReviews).toHaveBeenCalledWith("document-saved");
    expect((await screen.findAllByText("Pergunta persistida")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("3 cards gerados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dificil" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Prioridade: 70/)).toBeInTheDocument();
    expect(screen.getByText("Fila de revisao")).toBeInTheDocument();
    expect(screen.getByText("2 cards vencidos")).toBeInTheDocument();
    expect(screen.getAllByText(/Prioridade 100/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Prioridade 70/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Pergunta futura")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Pergunta atrasada/ }));

    expect(screen.getByText("Card 2 de 3")).toBeInTheDocument();
    expect(screen.getAllByText("Pergunta atrasada").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Historico de revisoes")).toBeInTheDocument();
    expect(screen.getByText("3 revisoes | Prioridade media: 63")).toBeInTheDocument();
    expect(screen.getByText("Retencao")).toBeInTheDocument();
    expect(screen.getByText("33% retencao")).toBeInTheDocument();
    expect(screen.getByText("2 cards dificeis")).toBeInTheDocument();
    expect(screen.getAllByText("Pergunta atrasada").length).toBeGreaterThan(0);
    expect(screen.getByText("Errei | Prioridade 100")).toBeInTheDocument();
  });

  it("imports a text book from a file path", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-1",
      book_id: "book-1",
      content: "Conteudo importado para estudo.",
      language: "Pt",
      source_type: "txt",
      source_path: "/tmp/book.txt"
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

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt ou .pdf"), {
      target: { value: "/tmp/book.txt" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    await waitFor(() => {
      expect(importTextBook).toHaveBeenCalledWith("/tmp/book.txt", {
        ocrEnabled: false,
        ocrLanguage: "por"
      });
    });
    expect(chunkTextDocument).toHaveBeenCalledWith({
      document_id: "document-1",
      book_id: "book-1",
      content: "Conteudo importado para estudo.",
      language: "Pt",
      max_words_per_chunk: 180
    });
    expect(await screen.findByText("Documento importado")).toBeInTheDocument();
    expect(screen.getByText("Origem: TXT")).toBeInTheDocument();
    expect(screen.getByText("Arquivo: /tmp/book.txt")).toBeInTheDocument();
    expect(screen.getAllByText("Conteudo importado para estudo.").length).toBeGreaterThan(0);
    expect(screen.getByText("1 chunk gerado")).toBeInTheDocument();
    expect(await screen.findByText("1 card gerado")).toBeInTheDocument();
    expect(screen.getByText("Pergunta 1 sobre o trecho 0")).toBeInTheDocument();
    expect(screen.getAllByText("Conteudo importado para estudo.").length).toBeGreaterThan(0);
  });

  it("imports with selected OCR language when OCR is enabled", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-ocr",
      book_id: "book-ocr",
      content: "Conteudo OCR.",
      language: "Pt",
      source_type: "pdf",
      source_path: "/tmp/scanned.pdf"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });

    renderApp({
      importTextBook,
      chunkTextDocument,
      saveStudyCards: saveCards
    });

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt ou .pdf"), {
      target: { value: "/tmp/scanned.pdf" }
    });
    fireEvent.click(screen.getByLabelText("Ativar OCR para PDF digitalizado"));
    fireEvent.change(screen.getByLabelText("Idioma OCR"), {
      target: { value: "eng" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    await waitFor(() => {
      expect(importTextBook).toHaveBeenCalledWith("/tmp/scanned.pdf", {
        ocrEnabled: true,
        ocrLanguage: "eng"
      });
    });
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

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt ou .pdf"), {
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

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt ou .pdf"), {
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

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt ou .pdf"), {
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

  it("records review results while studying cards", async () => {
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
    const saveStudyReview = vi.fn().mockImplementation(async (cardId: string, rating: string) => ({
      id: `review-${cardId}`,
      card_id: cardId,
      session_id: "session-import",
      rating,
      priority: rating === "hard" ? 70 : 20,
      next_review_at: rating === "hard" ? 1700086400 : 1700604800
    }));

    renderApp({
      importTextBook,
      chunkTextDocument,
      generateCards,
      saveStudyCards: saveCards,
      saveStudyReview
    });

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt ou .pdf"), {
      target: { value: "/tmp/book.txt" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByText("Pergunta 1")).toBeInTheDocument();
    expect(screen.getAllByText("Acertos: 0 | Erros: 0 | Dificeis: 0")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Acertei" }));

    expect(screen.getByText("Pergunta 2")).toBeInTheDocument();
    await waitFor(() => {
      expect(saveStudyReview).toHaveBeenCalledWith("card-1", "easy", "session-1");
    });
    expect(screen.getByText("1 revisao | Prioridade media: 20")).toBeInTheDocument();
    expect(screen.getByText("1 revisao nesta sessao")).toBeInTheDocument();
    expect(screen.getByText("Sessoes de estudo")).toBeInTheDocument();
    expect(screen.getAllByText("Acertos: 1 | Erros: 0 | Dificeis: 0")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Dificil" }));

    await waitFor(() => {
      expect(saveStudyReview).toHaveBeenCalledWith("card-2", "hard", "session-1");
    });
    expect(screen.getByText("2 revisoes nesta sessao")).toBeInTheDocument();
    expect(screen.getAllByText("Acertos: 1 | Erros: 0 | Dificeis: 1")).toHaveLength(2);
    expect(screen.getByText("Card 2 de 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dificil" })).toHaveAttribute("aria-pressed", "true");
  });

  it("exports a markdown report from study sessions", async () => {
    const downloadTextFile = vi.fn();
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-saved",
          book_id: "book-saved",
          content: "Algebra linear\nVetores e matrizes.",
          language: "Pt",
          source_type: "pdf",
          source_path: "/tmp/algebra.pdf"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([
      {
        id: "card-saved",
        bookId: "book-saved",
        chunkId: "chunk-saved",
        front: "O que e vetor?",
        back: "Objeto matematico com modulo, direcao e sentido.",
        tags: ["saved"]
      }
    ]);
    const listStudyReviews = vi.fn().mockResolvedValue([
      {
        id: "review-1",
        card_id: "card-saved",
        session_id: "session-persisted",
        rating: "easy",
        priority: 20,
        next_review_at: 1700604800
      }
    ]);
    const listStudySessionSummaries = vi.fn().mockResolvedValue([
      {
        session_id: "session-persisted",
        document_id: "document-saved",
        started_at: 1700000000,
        again_count: 1,
        hard_count: 2,
        easy_count: 3
      }
    ]);

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listStudyReviews,
      listStudySessionSummaries,
      downloadTextFile
    });

    fireEvent.click(await screen.findByRole("button", { name: /Algebra linear/ }));
    expect(await screen.findByText("Sessoes de estudo")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Exportar relatorio" }));

    expect(downloadTextFile).toHaveBeenCalledWith(
      "relatorio-estudo-document-saved.md",
      expect.stringContaining("# Relatorio de estudo - Algebra linear")
    );
    expect(downloadTextFile.mock.calls[0][1]).toContain("- Sessoes: 2");
    expect(downloadTextFile.mock.calls[0][1]).toContain("- Acertos: 3");
    expect(downloadTextFile.mock.calls[0][1]).toContain("- Dificeis: 2");
    expect(downloadTextFile.mock.calls[0][1]).toContain("- Erros: 1");
    expect(downloadTextFile.mock.calls[0][1]).toContain("## Sessao 1");
  });

  it("exports a printable PDF study session report", async () => {
    const printStudySessionReport = vi.fn();
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-pdf-report",
          book_id: "book-pdf-report",
          content: "Historia geral\nIdade Media.",
          language: "Pt",
          source_type: "pdf",
          source_path: "/tmp/historia.pdf"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([
      {
        id: "card-pdf-report",
        bookId: "book-pdf-report",
        chunkId: "chunk-pdf-report",
        front: "O que foi o feudalismo?",
        back: "Sistema social e economico medieval.",
        tags: ["historia"]
      }
    ]);
    const listStudySessionSummaries = vi.fn().mockResolvedValue([
      {
        session_id: "session-pdf-report",
        document_id: "document-pdf-report",
        started_at: 1700000000,
        again_count: 1,
        hard_count: 0,
        easy_count: 4
      }
    ]);

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listStudySessionSummaries,
      printStudySessionReport
    });

    fireEvent.click(await screen.findByRole("button", { name: /Historia geral/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Exportar PDF" }));

    expect(printStudySessionReport).toHaveBeenCalledWith(
      "relatorio-estudo-document-pdf-report.pdf",
      expect.stringContaining("<title>Relatorio de estudo - Historia geral</title>")
    );
    expect(printStudySessionReport.mock.calls[0][1]).toContain("<h1>Relatorio de estudo - Historia geral</h1>");
    expect(printStudySessionReport.mock.calls[0][1]).toContain("<strong>Acertos</strong>");
    expect(printStudySessionReport.mock.calls[0][1]).toContain("<span>4</span>");
  });

  it("shows retention trend across study sessions", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-trend",
          book_id: "book-trend",
          content: "Quimica organica.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/quimica.txt"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([
      {
        id: "card-trend",
        bookId: "book-trend",
        chunkId: "chunk-trend",
        front: "O que e carbono?",
        back: "Elemento quimico.",
        tags: ["quimica"]
      }
    ]);
    const listStudyReviews = vi.fn().mockResolvedValue([
      {
        id: "review-trend",
        card_id: "card-trend",
        session_id: "session-latest",
        rating: "easy",
        priority: 20,
        next_review_at: 1700604800
      }
    ]);
    const listStudySessionSummaries = vi.fn().mockResolvedValue([
      {
        session_id: "session-old",
        document_id: "document-trend",
        started_at: 1700000000,
        again_count: 2,
        hard_count: 0,
        easy_count: 1
      },
      {
        session_id: "session-latest",
        document_id: "document-trend",
        started_at: 1700086400,
        again_count: 0,
        hard_count: 1,
        easy_count: 3
      }
    ]);

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listStudyReviews,
      listStudySessionSummaries
    });

    fireEvent.click(await screen.findByRole("button", { name: /Quimica organica/ }));

    expect(await screen.findByText("Tendencia por sessao")).toBeInTheDocument();
    expect(screen.getByText("Melhorando")).toBeInTheDocument();
    expect(screen.getByText("33% para 75%")).toBeInTheDocument();
  });

  it("shows difficult card evolution by period", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-hard-trend",
          book_id: "book-hard-trend",
          content: "Fisica mecanica.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/fisica.txt"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([
      {
        id: "card-hard-trend",
        bookId: "book-hard-trend",
        chunkId: "chunk-hard-trend",
        front: "O que e forca?",
        back: "Interacao que altera movimento.",
        tags: ["fisica"]
      }
    ]);
    const listStudySessionSummaries = vi.fn().mockResolvedValue([
      {
        session_id: "session-hard-old",
        document_id: "document-hard-trend",
        started_at: 1700000000,
        again_count: 2,
        hard_count: 1,
        easy_count: 1
      },
      {
        session_id: "session-hard-latest",
        document_id: "document-hard-trend",
        started_at: 1700604800,
        again_count: 0,
        hard_count: 1,
        easy_count: 4
      }
    ]);

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listStudySessionSummaries
    });

    fireEvent.click(await screen.findByRole("button", { name: /Fisica mecanica/ }));

    expect(await screen.findByText("Cards dificeis por periodo")).toBeInTheDocument();
    expect(screen.getByText("Reducao")).toBeInTheDocument();
    expect(screen.getByText("Periodo 1")).toBeInTheDocument();
    expect(screen.getByText("3 cards dificeis")).toBeInTheDocument();
    expect(screen.getByText("Periodo 2")).toBeInTheDocument();
    expect(screen.getByText("1 card dificil")).toBeInTheDocument();
  });

  it("filters study metrics by period", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-period-filter",
          book_id: "book-period-filter",
          content: "Geografia fisica.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/geografia.txt"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([
      {
        id: "card-period-filter",
        bookId: "book-period-filter",
        chunkId: "chunk-period-filter",
        front: "O que e relevo?",
        back: "Forma da superficie terrestre.",
        tags: ["geografia"]
      }
    ]);
    const listStudySessionSummaries = vi.fn().mockResolvedValue([
      {
        session_id: "session-period-old",
        document_id: "document-period-filter",
        started_at: 1700000000,
        again_count: 2,
        hard_count: 1,
        easy_count: 1
      },
      {
        session_id: "session-period-latest",
        document_id: "document-period-filter",
        started_at: 1700864000,
        again_count: 0,
        hard_count: 1,
        easy_count: 4
      }
    ]);

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listStudySessionSummaries
    });

    fireEvent.click(await screen.findByRole("button", { name: /Geografia fisica/ }));

    expect(await screen.findByText("Resumo do periodo")).toBeInTheDocument();
    expect(screen.getByText("2 sessoes no periodo")).toBeInTheDocument();
    expect(screen.getByText("9 revisoes no periodo")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Periodo das metricas"), {
      target: { value: "last7" }
    });

    expect(screen.getByText("1 sessao no periodo")).toBeInTheDocument();
    expect(screen.getByText("5 revisoes no periodo")).toBeInTheDocument();
    expect(screen.queryByText("9 revisoes no periodo")).not.toBeInTheDocument();
  });

  it("exports study cards as an Anki TSV deck", async () => {
    const downloadTextFile = vi.fn();
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-anki",
          book_id: "book-anki",
          content: "Biologia celular.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/biologia.txt"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([
      {
        id: "card-1",
        bookId: "book-anki",
        chunkId: "chunk-1",
        front: "O que e celula?\nExplique.",
        back: "Unidade basica da vida.",
        tags: ["biologia", "celula animal"]
      },
      {
        id: "card-2",
        bookId: "book-anki",
        chunkId: "chunk-1",
        front: "Funcao da mitocondria?",
        back: "Produzir energia.",
        tags: ["biologia"]
      }
    ]);

    renderApp({
      downloadTextFile,
      listImportedDocuments,
      listStudyCards
    });

    fireEvent.click(await screen.findByRole("button", { name: /Biologia celular/ }));
    expect(await screen.findByText(/O que e celula/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Exportar Anki" }));

    expect(downloadTextFile).toHaveBeenCalledWith(
      "anki-document-anki.tsv",
      [
        "O que e celula? Explique.\tUnidade basica da vida.\tbiologia celula_animal",
        "Funcao da mitocondria?\tProduzir energia.\tbiologia"
      ].join("\n")
    );
  });

  it("shows an error when import fails", async () => {
    const importTextBook = vi.fn().mockRejectedValue(new Error("Arquivo de texto nao encontrado."));

    renderApp({
      importTextBook,
      listStudyCards: listNoStudyCards
    });

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt ou .pdf"), {
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

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt ou .pdf"), {
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

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt ou .pdf"), {
      target: { value: "/tmp/book.txt" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao gerar cards.");
  });
});
