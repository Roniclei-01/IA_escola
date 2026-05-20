import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudyCard } from "../domain/model-adapter";
import type { GenerateStudyCardsOptions } from "../infrastructure/tauri/generate-study-cards";
import i18n, { UI_LANGUAGE_STORAGE_KEY } from "../i18n";
import { App } from "./App";

const listNoDocuments = vi.fn().mockResolvedValue({ documents: [] });
const listNoArchivedDocuments = vi.fn().mockResolvedValue({ documents: [] });
const listNoStudyCards = vi.fn().mockResolvedValue([]);
const listNoStudyReviews = vi.fn().mockResolvedValue([]);
const listNoStudySessionSummaries = vi.fn().mockResolvedValue([]);
const loadNoStudyGoal = vi.fn().mockResolvedValue(null);
const loadNoDocumentStudyMetadata = vi.fn().mockResolvedValue(null);
const saveDocumentStudyMetadata = vi.fn().mockImplementation(
  async (documentId: string, category: string, subcategory: string, description: string) => ({
    document_id: documentId,
    category,
    subcategory,
    description
  })
);
const saveStudyGoal = vi
  .fn()
  .mockImplementation(async (documentId: string, targetReviews: number, recurrence: string) => ({
    document_id: documentId,
    target_reviews: targetReviews,
    recurrence
  }));
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
  model: "llama3.2:1b"
});
const saveOllamaSettings = vi.fn().mockImplementation(async (settings: unknown) => settings);
const loadDefaultNotificationSettings = vi.fn().mockResolvedValue({
  study_goal_reminders_enabled: true,
  study_goal_reminder_time: "08:00"
});
const saveNotificationSettings = vi.fn().mockImplementation(async (settings: unknown) => settings);
const testOcrDependencies = vi.fn().mockResolvedValue({
  pdftoppm_available: true,
  tesseract_available: true
});
const loadNoDocumentTranslation = vi.fn().mockResolvedValue({ translation: null });
const listNoDocumentPageTranslations = vi.fn().mockResolvedValue({ page_indexes: [] });
const loadNoMeditationNotes = vi.fn().mockResolvedValue({
  document_id: "document-1",
  notes: []
});
const addMeditationNote = vi.fn().mockImplementation(async (documentId: string, content: string) => ({
  document_id: documentId,
  notes: [
    {
      id: "note-1",
      content,
      created_at: "2026-05-19T14:00:00Z"
    }
  ]
}));
const updateMeditationNote = vi
  .fn()
  .mockImplementation(async (documentId: string, noteId: string, content: string) => ({
    document_id: documentId,
    notes: [
      {
        id: noteId,
        content,
        created_at: "2026-05-19T14:00:00Z"
      }
    ]
  }));
const deleteMeditationNote = vi.fn().mockImplementation(async (documentId: string) => ({
  document_id: documentId,
  notes: []
}));
const renderDefaultPdfPage = vi.fn().mockResolvedValue({
  page: 1,
  page_count: 1,
  image_data_url: "data:image/png;base64,UE5H"
});
const loadDefaultPdfReaderPreference = vi.fn().mockImplementation(async (documentId: string) => ({
  document_id: documentId,
  page: 1,
  zoom: 1,
  reader_page: 1
}));
const saveDefaultPdfReaderPreference = vi.fn().mockImplementation(async (preference: unknown) => preference);

function renderApp(props: ComponentProps<typeof App> = {}) {
  return render(
    <App
      listImportedDocuments={listNoDocuments}
      listArchivedDocuments={listNoArchivedDocuments}
      listStudyReviews={listNoStudyReviews}
      listStudySessionSummaries={listNoStudySessionSummaries}
      loadStudyGoal={loadNoStudyGoal}
      loadDocumentStudyMetadata={loadNoDocumentStudyMetadata}
      saveDocumentStudyMetadata={saveDocumentStudyMetadata}
      saveStudyGoal={saveStudyGoal}
      saveStudyReview={saveStudyReview}
      startStudySession={startStudySession}
      selectStudyFile={selectNoFile}
      loadOllamaSettings={loadDefaultOllamaSettings}
      saveOllamaSettings={saveOllamaSettings}
      loadNotificationSettings={loadDefaultNotificationSettings}
      saveNotificationSettings={saveNotificationSettings}
      testOcrDependencies={testOcrDependencies}
      loadDocumentTranslation={loadNoDocumentTranslation}
      listDocumentPageTranslations={listNoDocumentPageTranslations}
      loadMeditationNotes={loadNoMeditationNotes}
      addMeditationNote={addMeditationNote}
      updateMeditationNote={updateMeditationNote}
      deleteMeditationNote={deleteMeditationNote}
      renderPdfPage={renderDefaultPdfPage}
      loadPdfReaderPreference={loadDefaultPdfReaderPreference}
      savePdfReaderPreference={saveDefaultPdfReaderPreference}
      {...props}
    />
  );
}

function openImportDialog() {
  fireEvent.click(screen.getAllByRole("button", { name: "Importar livro" })[0]);
}

function fillImportFilePath(filePath: string) {
  openImportDialog();
  fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt ou .pdf"), {
    target: { value: filePath }
  });
}

function selectLibraryCategory(category = "Geral") {
  fireEvent.change(screen.getByLabelText("Categoria da biblioteca"), {
    target: { value: category }
  });
}

describe("App", () => {
  afterEach(async () => {
    window.localStorage.removeItem(UI_LANGUAGE_STORAGE_KEY);
    await act(async () => {
      await i18n.changeLanguage("pt");
    });
    renderDefaultPdfPage.mockClear();
    loadDefaultPdfReaderPreference.mockClear();
    saveDefaultPdfReaderPreference.mockClear();
    listNoDocumentPageTranslations.mockClear();
    loadNoDocumentStudyMetadata.mockClear();
    saveDocumentStudyMetadata.mockClear();
    loadNoMeditationNotes.mockClear();
    addMeditationNote.mockClear();
    updateMeditationNote.mockClear();
    deleteMeditationNote.mockClear();
  });

  it("renders the product name", async () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "Estudo IA Local" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Importacao e IA" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Biblioteca" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Estudo ativo" })).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Categorias academicas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Geral/ })).toBeInTheDocument();
  });

  it("opens the active study in a secondary page and returns to the library", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-secondary-page",
      book_id: "book-secondary-page",
      content: "Conteudo para tela secundaria.",
      language: "Pt",
      source_type: "txt",
      source_path: "/tmp/secundario.txt"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });

    renderApp({ importTextBook, chunkTextDocument });

    expect(screen.getByRole("heading", { name: "Importacao e IA" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Estudo ativo" })).not.toBeInTheDocument();

    fillImportFilePath("/tmp/secundario.txt");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("heading", { name: "Estudo ativo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Previa do conteudo" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Importacao e IA" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Biblioteca" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Voltar para biblioteca" }));

    expect(await screen.findByRole("heading", { name: "Importacao e IA" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Biblioteca" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Estudo ativo" })).not.toBeInTheDocument();
  });

  it("changes the interface language and persists the selected option", async () => {
    renderApp();

    fireEvent.change(screen.getByLabelText("Idioma da interface"), {
      target: { value: "en" }
    });

    expect(await screen.findByRole("heading", { name: "Import and AI" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Technology and Computing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Technology and Computing/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tecnologia e Computacao/ })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY)).toBe("en");

    fireEvent.change(screen.getByLabelText("Interface language"), {
      target: { value: "es" }
    });

    expect(await screen.findByRole("heading", { name: "Importacion e IA" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Tecnologia y Computacion" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tecnologia y Computacion/ })).toBeInTheDocument();
    expect(window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY)).toBe("es");
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
    fireEvent.click(await screen.findByRole("button", { name: /Geral/ }));
    expect(await screen.findByText("Documentos salvos")).toBeInTheDocument();
    expect(await screen.findByText("Documento salvo anteriormente.")).toBeInTheDocument();
  });

  it("loads and saves study classification for the active document", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-category",
      book_id: "book-category",
      content: "Livro de Python para estudo.",
      language: "Pt",
      source_type: "txt",
      source_path: "/tmp/python.txt"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });
    const loadDocumentStudyMetadata = vi.fn().mockResolvedValue({
      document_id: "document-category",
      category: "Programacao",
      subcategory: "Python",
      description: "Material para fundamentos de Python."
    });
    const saveDocumentStudyMetadata = vi
      .fn()
      .mockImplementation(
        async (documentId: string, category: string, subcategory: string, description: string) => ({
          document_id: documentId,
          category,
          subcategory,
          description
        })
      );

    renderApp({
      importTextBook,
      chunkTextDocument,
      loadDocumentStudyMetadata,
      saveDocumentStudyMetadata
    });

    fillImportFilePath("/tmp/python.txt");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("heading", { name: "Classificacao de estudo" })).toBeInTheDocument();
    const classificationPanel = screen.getByRole("region", { name: "Classificacao de estudo" });
    const classificationQueries = within(classificationPanel);
    await waitFor(() => {
      expect(loadDocumentStudyMetadata).toHaveBeenCalledWith("document-category");
    });
    expect(classificationQueries.getByLabelText("Categoria")).toHaveValue("Programacao");
    expect(classificationQueries.getByLabelText("Subcategoria")).toHaveValue("Python");
    expect(classificationQueries.getByLabelText("Descricao da classificacao")).toHaveValue(
      "Material para fundamentos de Python."
    );

    fireEvent.change(classificationQueries.getByLabelText("Categoria"), {
      target: { value: "Redes" }
    });
    fireEvent.change(classificationQueries.getByLabelText("Subcategoria"), {
      target: { value: "TCP/IP" }
    });
    fireEvent.change(classificationQueries.getByLabelText("Descricao da classificacao"), {
      target: { value: "Base para revisar redes de computadores." }
    });
    fireEvent.click(classificationQueries.getByRole("button", { name: "Salvar classificacao" }));

    await waitFor(() => {
      expect(saveDocumentStudyMetadata).toHaveBeenCalledWith(
        "document-category",
        "Redes",
        "TCP/IP",
        "Base para revisar redes de computadores."
      );
    });
    expect(await screen.findByText("Classificacao salva.")).toBeInTheDocument();
  });

  it("saves the selected category metadata when importing a document", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-import-category",
      book_id: "book-import-category",
      content: "Livro importado com categoria.",
      language: "Pt",
      source_type: "txt",
      source_path: "/tmp/categoria.txt"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });
    const saveDocumentStudyMetadata = vi
      .fn()
      .mockImplementation(
        async (documentId: string, category: string, subcategory: string, description: string) => ({
          document_id: documentId,
          category,
          subcategory,
          description
        })
      );

    renderApp({
      importTextBook,
      chunkTextDocument,
      saveDocumentStudyMetadata
    });

    openImportDialog();
    fireEvent.change(screen.getByLabelText("Categoria"), {
      target: { value: "Tecnologia e Computacao" }
    });
    fireEvent.change(screen.getByLabelText("Subcategoria"), {
      target: { value: "Redes de computadores" }
    });
    fireEvent.change(screen.getByLabelText("Descricao para novos livros"), {
      target: { value: "Trilha inicial de Python." }
    });
    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt ou .pdf"), {
      target: { value: "/tmp/categoria.txt" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    await waitFor(() => {
      expect(saveDocumentStudyMetadata).toHaveBeenCalledWith(
        "document-import-category",
        "Tecnologia e Computacao",
        "Redes de computadores",
        "Trilha inicial de Python."
      );
    });
  });

  it("filters saved books by category and opens them from Meus Livros", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-python",
          book_id: "book-python",
          content: "Python Crash Course",
          language: "Pt",
          source_type: "pdf",
          source_path: "/tmp/python.pdf"
        },
        {
          document_id: "document-network",
          book_id: "book-network",
          content: "Computer Networking",
          language: "Pt",
          source_type: "pdf",
          source_path: "/tmp/network.pdf"
        }
      ]
    });
    const loadDocumentStudyMetadata = vi.fn().mockImplementation(async (documentId: string) => {
      if (documentId === "document-python") {
        return {
          document_id: documentId,
          category: "Programacao",
          subcategory: "Python",
          description: "Programacao com Python."
        };
      }

      return {
        document_id: documentId,
        category: "Redes",
        subcategory: "TCP/IP",
        description: "Fundamentos de redes."
      };
    });
    const listDocumentChunks = vi.fn().mockResolvedValue({ chunks: [] });

    renderApp({
      listImportedDocuments,
      loadDocumentStudyMetadata,
      listStudyCards: listNoStudyCards,
      listDocumentChunks
    });

    expect(await screen.findByRole("heading", { name: "Categorias academicas" })).toBeInTheDocument();
    expect(screen.queryByText("Python Crash Course")).not.toBeInTheDocument();
    expect(screen.queryByText("Computer Networking")).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /Redes/ }));

    expect(screen.queryByText("Python Crash Course")).not.toBeInTheDocument();
    expect(await screen.findByText("Computer Networking")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Meus Livros" }));
    const booksDialog = await screen.findByRole("dialog", { name: "Meus Livros" });
    const booksQueries = within(booksDialog);

    expect(booksQueries.queryByText("Python Crash Course")).not.toBeInTheDocument();
    fireEvent.click(booksQueries.getByRole("button", { name: /Computer Networking/ }));

    expect(await screen.findByRole("heading", { name: "Previa do conteudo" })).toBeInTheDocument();
    await waitFor(() => {
      expect(listDocumentChunks).toHaveBeenCalledWith("document-network");
    });
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
    selectLibraryCategory();

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
    selectLibraryCategory();

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
    selectLibraryCategory();

    expect(await screen.findByText("Apostila de algebra linear.")).toBeInTheDocument();
    expect(screen.getByText("Resumo de historia do Brasil.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar na biblioteca"), {
      target: { value: "historia" }
    });
    fireEvent.keyDown(screen.getByLabelText("Buscar na biblioteca"), {
      key: "Enter"
    });

    expect(screen.queryByText("Apostila de algebra linear.")).not.toBeInTheDocument();
    expect(screen.getByText("Resumo de historia do Brasil.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar na biblioteca"), {
      target: { value: "ALGEBRA.PDF" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Pesquisar" }));

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
    selectLibraryCategory();

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

    fireEvent.click(await screen.findByRole("button", { name: /Geral/ }));
    expect(await screen.findByText("Documento que sera arquivado.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Arquivar" }));

    await waitFor(() => {
      expect(archiveImportedDocument).toHaveBeenCalledWith("document-archived");
    });
    expect(screen.getByText("Nenhum documento corresponde aos filtros.")).toBeInTheDocument();
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
    expect(await screen.findByText("Documento arquivado para restaurar.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));

    await waitFor(() => {
      expect(restoreImportedDocument).toHaveBeenCalledWith("document-restored");
    });
    await waitFor(() => {
      expect(screen.queryByText("Nenhum documento salvo ainda.")).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Geral/ }));
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
    expect(await screen.findByText("OCR indisponivel neste computador.")).toBeInTheDocument();
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

    openImportDialog();
    fireEvent.click(screen.getByRole("button", { name: "Selecionar" }));

    expect(await screen.findByDisplayValue("/tmp/book.pdf")).toBeInTheDocument();
    expect(selectStudyFile).toHaveBeenCalled();
  });

  it("disables document library actions while an import is running", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-busy",
          book_id: "book-busy",
          content: "Documento ja salvo.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/salvo.txt"
        }
      ]
    });
    const importTextBook = vi.fn(
      () =>
        new Promise<never>(() => {
          // Keep import pending so library actions stay disabled.
        })
    );
    const listDocumentChunks = vi.fn();

    renderApp({
      listImportedDocuments,
      importTextBook,
      listDocumentChunks
    });
    selectLibraryCategory();

    await screen.findByRole("button", { name: /Documento 1/ });
    fillImportFilePath("/tmp/novo.txt");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    const savedDocumentButton = await screen.findByRole("button", { name: /Documento 1/ });
    expect(await screen.findByRole("status")).toHaveTextContent("Importando documento.");
    expect(await screen.findByRole("dialog", { name: "Processando arquivo" })).toHaveTextContent(
      "Importando documento."
    );
    expect(savedDocumentButton).toBeDisabled();
    expect(screen.getByLabelText("Buscar na biblioteca")).toBeDisabled();
    expect(screen.getByLabelText("Tipo de arquivo")).toBeDisabled();
    expect(screen.getByLabelText("Status de revisao")).toBeDisabled();
    expect(screen.getByLabelText("Ordenar biblioteca")).toBeDisabled();

    fireEvent.click(savedDocumentButton);

    expect(listDocumentChunks).not.toHaveBeenCalled();
  });

  it("cancels a pending import flow and ignores late results", async () => {
    let resolveImport: (document: {
      document_id: string;
      book_id: string;
      content: string;
      language: "Pt";
      source_type: "txt";
      source_path: string;
    }) => void = () => {};
    const importTextBook = vi.fn(
      () =>
        new Promise<{
          document_id: string;
          book_id: string;
          content: string;
          language: "Pt";
          source_type: "txt";
          source_path: string;
        }>((resolve) => {
          resolveImport = resolve;
        })
    );
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });

    renderApp({
      importTextBook,
      chunkTextDocument
    });

    fillImportFilePath("/tmp/cancelado.txt");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Importando documento.");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar operacao" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Operacao cancelada.");
    resolveImport({
      document_id: "document-canceled",
      book_id: "book-canceled",
      content: "Documento cancelado nao deve aparecer.",
      language: "Pt",
      source_type: "txt",
      source_path: "/tmp/cancelado.txt"
    });

    await waitFor(() => {
      expect(chunkTextDocument).not.toHaveBeenCalled();
    });
    expect(screen.queryByText("Documento cancelado nao deve aparecer.")).not.toBeInTheDocument();
  });

  it("shows card generation progress while Ollama processes chunks", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-progress",
      book_id: "book-progress",
      content: "Conteudo para acompanhar progresso.",
      language: "Pt",
      source_type: "txt",
      source_path: "/tmp/progresso.txt"
    });
    const chunks = Array.from({ length: 3 }, (_, index) => ({
      id: `chunk-${index + 1}`,
      book_id: "book-progress",
      document_id: "document-progress",
      position: index,
      content: `Chunk ${index + 1}.`,
      token_estimate: 2
    }));
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks });
    const generateCards = vi.fn(
      (
        _chunks: typeof chunks,
        options?: {
          onProgress?: (progress: { current: number; total: number }) => void;
          onQueueProgress?: (progress: {
            current: number;
            total: number;
            completed: number;
            failed: number;
            pending: number;
            currentChunkId: string;
            status: "running";
          }) => void;
        }
      ) => {
        options?.onProgress?.({ current: 2, total: 3 });
        options?.onQueueProgress?.({
          current: 2,
          total: 3,
          completed: 1,
          failed: 0,
          pending: 1,
          currentChunkId: "chunk-2",
          status: "running"
        });
        return new Promise<StudyCard[]>(() => {
          // Keep generation pending so progress remains visible.
        });
      }
    );

    renderApp({
      importTextBook,
      chunkTextDocument,
      generateCards,
      enableDevelopmentFallback: false
    });

    fillImportFilePath("/tmp/progresso.txt");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Gerando cards com Ollama. Chunk 2 de 3. Fila: 1 concluidos, 0 falharam, 1 pendentes."
      );
    });
    expect(
      screen.getByLabelText("Geracao de cards em segundo plano")
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Processando arquivo" })).not.toBeInTheDocument();
    const queuePanel = screen.getByLabelText("Fila de geracao de cards");
    expect(screen.getByLabelText("Progresso da fila de cards")).toHaveAttribute(
      "aria-valuenow",
      "1"
    );
    expect(within(queuePanel).getByText("Concluidos")).toBeInTheDocument();
    expect(within(queuePanel).getByText("Falhas")).toBeInTheDocument();
    expect(within(queuePanel).getByText("Pendentes")).toBeInTheDocument();
  });

  it("aborts the active card generation request when canceling", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-abort",
      book_id: "book-abort",
      content: "Conteudo para abortar geracao.",
      language: "Pt",
      source_type: "txt",
      source_path: "/tmp/abortar.txt"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({
      chunks: [
        {
          id: "chunk-abort",
          book_id: "book-abort",
          document_id: "document-abort",
          position: 1,
          content: "Chunk para abortar.",
          token_estimate: 2
        }
      ]
    });
    let capturedSignal: AbortSignal | undefined;
    const generateCards = vi.fn(
      (
        _chunks: Array<{
          id: string;
          book_id: string;
          document_id: string;
          position: number;
          content: string;
          token_estimate: number;
        }>,
        options?: { signal?: AbortSignal }
      ) => {
        capturedSignal = options?.signal;

        return new Promise<StudyCard[]>(() => {
          // Keep generation pending until the user cancels.
        });
      }
    );

    renderApp({
      importTextBook,
      chunkTextDocument,
      generateCards,
      enableDevelopmentFallback: false
    });

    fillImportFilePath("/tmp/abortar.txt");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Gerando cards com Ollama.");
    });
    await waitFor(() => {
      expect(capturedSignal).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar operacao" }));

    expect(capturedSignal?.aborted).toBe(true);
  });

  it("shows an error when the native file picker fails", async () => {
    const selectStudyFile = vi.fn().mockRejectedValue(new Error("dialog failed"));

    renderApp({ selectStudyFile });

    openImportDialog();
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

  it("loads persisted chunks without generating cards when selecting a saved document", async () => {
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
      generateCards
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Documento 1/ }));

    await waitFor(() => {
      expect(listDocumentChunks).toHaveBeenCalledWith("document-saved");
    });
    expect(generateCards).not.toHaveBeenCalled();
    expect(await screen.findByText("1 chunk gerado")).toBeInTheDocument();
    expect(screen.getByText("0 card gerado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gerar cards" })).toBeInTheDocument();
    expect(screen.queryByText("Pergunta salva")).not.toBeInTheDocument();
  });

  it("offers a visible card generation retry when a saved document has no cards", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-without-cards",
          book_id: "book-without-cards",
          content: "Conteudo importado sem cards.",
          language: "Pt",
          source_type: "pdf",
          source_path: "/tmp/material.pdf"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([]);
    const listDocumentChunks = vi.fn().mockResolvedValue({ chunks: [] });
    const chunkTextDocument = vi.fn().mockResolvedValue({
      chunks: [
        {
          id: "chunk-retry",
          book_id: "book-without-cards",
          document_id: "document-without-cards",
          position: 1,
          content: "Conteudo importado sem cards.",
          token_estimate: 4
        }
      ]
    });
    const generateCards = vi.fn().mockResolvedValue([
      {
        id: "card-retry",
        bookId: "book-without-cards",
        chunkId: "chunk-retry",
        front: "Pergunta gerada depois",
        back: "Resposta gerada depois",
        tags: ["retry"]
      }
    ]);

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listDocumentChunks,
      chunkTextDocument,
      generateCards,
      saveStudyCards: saveCards
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Documento 1/ }));

    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

    await waitFor(() => {
      expect(chunkTextDocument).toHaveBeenCalledWith({
        document_id: "document-without-cards",
        book_id: "book-without-cards",
        content: "Conteudo importado sem cards.",
        language: "Pt",
        max_words_per_chunk: 180
      });
    });
    await waitFor(() => {
      expect(generateCards).toHaveBeenCalledWith(
        [
          {
            id: "chunk-retry",
            book_id: "book-without-cards",
            document_id: "document-without-cards",
            position: 1,
            content: "Conteudo importado sem cards.",
            token_estimate: 4
          }
        ],
        expect.objectContaining({ onProgress: expect.any(Function) })
      );
    });
    expect(await screen.findByText("Pergunta gerada depois")).toBeInTheDocument();
    expect(screen.getByText("1 card gerado")).toBeInTheDocument();
  });

  it("keeps partially saved retry cards when generation fails later", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-retry-partial",
          book_id: "book-retry-partial",
          content: "Conteudo importado para retry parcial.",
          language: "Pt",
          source_type: "pdf",
          source_path: "/tmp/retry-partial.pdf"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([]);
    const listDocumentChunks = vi.fn().mockResolvedValue({
      chunks: [
        {
          id: "chunk-saved",
          book_id: "book-saved",
          document_id: "document-saved",
          position: 1,
          content: "Chunk com cards persistidos.",
          token_estimate: 4
        },
        {
          id: "chunk-extra",
          book_id: "book-saved",
          document_id: "document-saved",
          position: 2,
          content: "Chunk ainda sem cards.",
          token_estimate: 4
        }
      ]
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({
      chunks: [
        {
          id: "chunk-retry-partial",
          book_id: "book-retry-partial",
          document_id: "document-retry-partial",
          position: 1,
          content: "Conteudo importado para retry parcial.",
          token_estimate: 4
        }
      ]
    });
    const partialCard = {
      id: "card-retry-partial",
      bookId: "book-retry-partial",
      chunkId: "chunk-retry-partial",
      front: "Pergunta retry parcial",
      back: "Resposta retry parcial",
      tags: ["retry"]
    };
    const saveStudyCards = vi.fn().mockImplementation(async (cards: StudyCard[]) => cards);
    const generateCards = vi.fn(
      async (
        _chunks: Array<{
          id: string;
          book_id: string;
          document_id: string;
          position: number;
          content: string;
          token_estimate: number;
        }>,
        options?: GenerateStudyCardsOptions
      ) => {
        await options?.onChunkCards?.([partialCard], { current: 1, total: 2 });
        throw new Error("Falha depois do retry parcial.");
      }
    );

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listDocumentChunks,
      chunkTextDocument,
      generateCards,
      saveStudyCards,
      enableDevelopmentFallback: false
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Documento 1/ }));

    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A geracao parou, mas 1 card ja foi salvo."
    );
    expect(screen.getByText("1 card gerado")).toBeInTheDocument();
    expect(screen.getByText("Pergunta retry parcial")).toBeInTheDocument();
    expect(screen.queryByText("Falha depois do retry parcial.")).not.toBeInTheDocument();
  });

  it("disables card generation retry while it is running", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-retry-disabled",
          book_id: "book-retry-disabled",
          content: "Conteudo para retry em andamento.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/retry.txt"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([]);
    const listDocumentChunks = vi.fn().mockResolvedValue({ chunks: [] });
    const chunkTextDocument = vi.fn(
      () =>
        new Promise<never>(() => {
          // Keep the operation pending so the disabled state can be asserted.
        })
    );

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listDocumentChunks,
      chunkTextDocument
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Documento 1/ }));

    const generateButton = await screen.findByRole("button", { name: "Gerar cards" });
    fireEvent.click(generateButton);

    expect(await screen.findByRole("status")).toHaveTextContent("Dividindo conteudo em chunks.");
    expect(generateButton).toBeDisabled();
  });

  it("keeps extracted PDF text hidden until requested", async () => {
    const longContent = `${"Conteudo extenso do PDF. ".repeat(
      60
    )}TRECHO FINAL IMPORTANTE DO DOCUMENTO.`;
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-long-preview",
          book_id: "book-long-preview",
          content: longContent,
          language: "Pt",
          source_type: "pdf",
          source_path: "/tmp/longo.pdf"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([]);
    const listDocumentChunks = vi.fn().mockResolvedValue({ chunks: [] });

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listDocumentChunks
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Documento 1/ }));

    expect(await screen.findByAltText("Pagina PDF 1")).toBeInTheDocument();
    expect(await screen.findByText("Texto extraido")).toBeInTheDocument();
    expect(screen.getByText(`${longContent.length} caracteres extraidos`)).toBeInTheDocument();
    expect(window.document.querySelector(".document-content-preview")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Mostrar texto extraido" }));

    expect(window.document.querySelector(".document-content-preview")).toHaveTextContent(
      "TRECHO FINAL IMPORTANTE DO DOCUMENTO"
    );
    fireEvent.click(screen.getByRole("button", { name: "Ocultar texto extraido" }));

    expect(window.document.querySelector(".document-content-preview")).toBeNull();
  });

  it("shows a paginated reader for long imported documents", async () => {
    const longContent = `${"Conteudo extenso do PDF. ".repeat(
      60
    )}TRECHO FINAL IMPORTANTE DO DOCUMENTO.`;
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-long-reader",
          book_id: "book-long-reader",
          content: longContent,
          language: "Pt",
          source_type: "pdf",
          source_path: "/tmp/longo.pdf"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([]);
    const listDocumentChunks = vi.fn().mockResolvedValue({ chunks: [] });

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listDocumentChunks
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Documento 1/ }));

    expect(await screen.findByText("Leitura do documento")).toBeInTheDocument();
    expect(screen.getAllByText(/Conteudo extenso do PDF/).length).toBeGreaterThan(0);
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
    const listDocumentChunks = vi.fn().mockResolvedValue({
      chunks: [
        {
          id: "chunk-saved",
          book_id: "book-saved",
          document_id: "document-saved",
          position: 1,
          content: "Chunk com cards persistidos.",
          token_estimate: 4
        },
        {
          id: "chunk-extra",
          book_id: "book-saved",
          document_id: "document-saved",
          position: 2,
          content: "Chunk ainda sem cards.",
          token_estimate: 4
        }
      ]
    });
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
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Documento 1/ }));

    await waitFor(() => {
      expect(listStudyCards).toHaveBeenCalledWith("document-saved");
    });
    expect(listDocumentChunks).toHaveBeenCalledWith("document-saved");
    expect(generateCards).not.toHaveBeenCalled();
    expect(listStudyReviews).toHaveBeenCalledWith("document-saved");
    expect((await screen.findAllByText("Pergunta persistida")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("3 cards gerados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gerar mais cards" })).toBeInTheDocument();
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

    fillImportFilePath("/tmp/book.txt");
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
    expect(screen.getByText("0 card gerado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gerar cards" })).toBeInTheDocument();
    expect(generateCards).not.toHaveBeenCalled();
    expect(screen.queryByText("Pergunta 1 sobre o trecho 0")).not.toBeInTheDocument();
    expect(screen.getAllByText("Conteudo importado para estudo.").length).toBeGreaterThan(0);
  });

  it("shows the document reader side by side and translates on demand", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-reader",
      book_id: "book-reader",
      content: "Texto original para leitura.",
      language: "Pt",
      source_type: "pdf",
      source_path: "/tmp/book.pdf"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });
    const translateDocument = vi.fn().mockResolvedValue({
      document_id: "document-reader",
      source_language: "Pt",
      target_language: "En",
      translated_content: "Translated text for reading."
    });

    renderApp({
      importTextBook,
      chunkTextDocument,
      translateDocument
    });

    fillImportFilePath("/tmp/book.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    const readerHeading = await screen.findByRole("heading", { name: "Leitura do documento" });
    const reader = readerHeading.closest(".document-reader");
    expect(reader).not.toBeNull();
    const readerQueries = within(reader as HTMLElement);

    expect(readerQueries.queryByRole("heading", { name: "Idioma original" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Idioma escolhido" })).toBeInTheDocument();
    expect(screen.getByLabelText("Idioma de leitura")).toHaveValue("En");
    const originalPaneToggle = readerQueries.getByRole("button", { name: "Mostrar idioma original" });
    expect(originalPaneToggle).toHaveAttribute("aria-expanded", "false");
    expect(readerQueries.queryByText("Texto original para leitura.")).not.toBeInTheDocument();

    fireEvent.click(originalPaneToggle);
    expect(originalPaneToggle).toHaveAttribute("aria-expanded", "true");
    expect(readerQueries.getByRole("heading", { name: "Idioma original" })).toBeInTheDocument();
    expect(readerQueries.getAllByText("Texto original para leitura.").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Traduzir pagina atual" }));

    await waitFor(() => {
      expect(translateDocument).toHaveBeenCalledWith({
        document_id: "document-reader",
        content: "Texto original para leitura.",
        source_language: "Pt",
        target_language: "En",
        page_index: 0
      });
    });
    expect(await screen.findByText("Translated text for reading.")).toBeInTheDocument();
    expect(screen.getByText("Traducao gerada agora e salva localmente.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retraduzir pagina" })).toBeInTheDocument();
  });

  it("uses a cached translated reader page before calling the model", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-cached-reader",
      book_id: "book-cached-reader",
      content: "Texto original em cache.",
      language: "Pt",
      source_type: "pdf",
      source_path: "/tmp/cached.pdf"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });
    const loadDocumentTranslation = vi.fn().mockResolvedValue({
      translation: {
        document_id: "document-cached-reader",
        source_language: "Pt",
        target_language: "En",
        translated_content: "Cached translated page."
      }
    });
    const translateDocument = vi.fn().mockResolvedValue({
      document_id: "document-cached-reader",
      source_language: "Pt",
      target_language: "En",
      translated_content: "Updated translated page."
    });

    renderApp({
      importTextBook,
      chunkTextDocument,
      loadDocumentTranslation,
      translateDocument
    });

    fillImportFilePath("/tmp/cached.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("heading", { name: "Leitura do documento" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Traduzir pagina atual" }));

    await waitFor(() => {
      expect(loadDocumentTranslation).toHaveBeenCalledWith("document-cached-reader", "En", 0);
    });
    expect(translateDocument).not.toHaveBeenCalled();
    expect(await screen.findByText("Cached translated page.")).toBeInTheDocument();
    expect(screen.getByText("Traducao carregada do cache local.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retraduzir pagina" }));

    await waitFor(() => {
      expect(translateDocument).toHaveBeenCalledWith({
        document_id: "document-cached-reader",
        content: "Texto original em cache.",
        source_language: "Pt",
        target_language: "En",
        page_index: 0
      });
    });
    expect(await screen.findByText("Updated translated page.")).toBeInTheDocument();
    expect(screen.getByText("Traducao gerada agora e salva localmente.")).toBeInTheDocument();
  });

  it("ignores empty cached reader translations and calls the model", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-empty-cache-reader",
      book_id: "book-empty-cache-reader",
      content: "Texto original sem cache valido.",
      language: "Pt",
      source_type: "pdf",
      source_path: "/tmp/empty-cache.pdf"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });
    const loadDocumentTranslation = vi.fn().mockResolvedValue({
      translation: {
        document_id: "document-empty-cache-reader",
        source_language: "Pt",
        target_language: "En",
        translated_content: "   "
      }
    });
    const translateDocument = vi.fn().mockResolvedValue({
      document_id: "document-empty-cache-reader",
      source_language: "Pt",
      target_language: "En",
      translated_content: "Generated translation after empty cache."
    });

    renderApp({
      importTextBook,
      chunkTextDocument,
      loadDocumentTranslation,
      translateDocument
    });

    fillImportFilePath("/tmp/empty-cache.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("heading", { name: "Leitura do documento" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Traduzir pagina atual" }));

    await waitFor(() => {
      expect(translateDocument).toHaveBeenCalledWith({
        document_id: "document-empty-cache-reader",
        content: "Texto original sem cache valido.",
        source_language: "Pt",
        target_language: "En",
        page_index: 0
      });
    });
    expect(await screen.findByText("Generated translation after empty cache.")).toBeInTheDocument();
  });

  it("loads a cached translated page automatically when navigating the reader", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-reader-navigation-cache",
      book_id: "book-reader-navigation-cache",
      content: `${"Primeira pagina longa para leitura. ".repeat(140)}\n\nSegunda pagina.`,
      language: "Pt",
      source_type: "pdf",
      source_path: "/tmp/navigation-cache.pdf"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });
    const loadDocumentTranslation = vi.fn().mockImplementation(
      async (_documentId: string, _targetLanguage: string, pageIndex?: number) => ({
        translation:
          pageIndex === 1
            ? {
                document_id: "document-reader-navigation-cache",
                source_language: "Pt",
                target_language: "En",
                translated_content: "Cached translated second reader page."
              }
            : null
      })
    );
    const translateDocument = vi.fn();

    renderApp({
      importTextBook,
      chunkTextDocument,
      loadDocumentTranslation,
      translateDocument
    });

    fillImportFilePath("/tmp/navigation-cache.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("heading", { name: "Leitura do documento" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Proxima pagina" }));

    await waitFor(() => {
      expect(loadDocumentTranslation).toHaveBeenCalledWith(
        "document-reader-navigation-cache",
        "En",
        1
      );
    });
    expect(translateDocument).not.toHaveBeenCalled();
    expect(await screen.findByText("Cached translated second reader page.")).toBeInTheDocument();
    expect(screen.getByText("Traducao carregada do cache local.")).toBeInTheDocument();
  });

  it("shows which reader pages already have saved translations", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-translated-pages",
          book_id: "book-translated-pages",
          content: `${"Primeira pagina do leitor. ".repeat(160)}\n\n${"Segunda pagina do leitor. ".repeat(
            160
          )}\n\n${"Terceira pagina do leitor. ".repeat(160)}`,
          language: "Pt",
          source_type: "pdf",
          source_path: "/tmp/translated-pages.pdf"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([]);
    const listDocumentChunks = vi.fn().mockResolvedValue({ chunks: [] });
    const listDocumentPageTranslations = vi.fn().mockResolvedValue({ page_indexes: [0, 2] });

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listDocumentChunks,
      listDocumentPageTranslations
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Documento 1/ }));

    await waitFor(() => {
      expect(listDocumentPageTranslations).toHaveBeenCalledWith("document-translated-pages", "En");
    });
    expect(await screen.findByText("Paginas traduzidas: 1, 3")).toBeInTheDocument();
  });

  it("renders the original PDF page with navigation and zoom controls", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-visual-pdf",
      book_id: "book-visual-pdf",
      content: "Texto extraido do PDF.",
      language: "Pt",
      source_type: "pdf",
      source_path: "/tmp/visual.pdf"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });
    const renderPdfPage = vi
      .fn()
      .mockImplementation(async ({ page }: { page: number }) => ({
        page,
        page_count: 2,
        image_data_url:
          page === 2
            ? "data:image/png;base64,UEFHSU5BMg=="
            : "data:image/png;base64,UEFHSU5BMQ=="
      }));

    renderApp({
      importTextBook,
      chunkTextDocument,
      renderPdfPage
    });

    fillImportFilePath("/tmp/visual.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("heading", { name: "PDF original" })).toBeInTheDocument();
    await waitFor(() => {
      expect(renderPdfPage).toHaveBeenCalledWith({
        file_path: "/tmp/visual.pdf",
        page: 1,
        dpi: 144
      });
    });
    expect(await screen.findByAltText("Pagina PDF 1")).toHaveAttribute(
      "src",
      "data:image/png;base64,UEFHSU5BMQ=="
    );
    expect(screen.getAllByText("Pagina PDF 1 de 2").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Zoom do PDF"), {
      target: { value: "1.25" }
    });
    expect(screen.getByAltText("Pagina PDF 1")).toHaveStyle({ width: "125%" });

    expect(screen.getByRole("button", { name: "Pagina anterior do PDF" })).toHaveTextContent("<");
    expect(screen.getByRole("button", { name: "Proxima pagina do PDF" })).toHaveTextContent(">");

    fireEvent.click(screen.getByRole("button", { name: "Proxima pagina do PDF" }));

    await waitFor(() => {
      expect(renderPdfPage).toHaveBeenLastCalledWith({
        file_path: "/tmp/visual.pdf",
        page: 2,
        dpi: 144
      });
    });
    expect(await screen.findByAltText("Pagina PDF 2")).toHaveAttribute(
      "src",
      "data:image/png;base64,UEFHSU5BMg=="
    );
  });

  it("restores and saves the PDF reader page and zoom per document", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-pdf-position",
      book_id: "book-pdf-position",
      content: "Texto extraido do PDF.",
      language: "Pt",
      source_type: "pdf",
      source_path: "/tmp/position.pdf"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });
    const loadPdfReaderPreference = vi.fn().mockResolvedValue({
      document_id: "document-pdf-position",
      page: 2,
      zoom: 1.25,
      reader_page: 1
    });
    const savePdfReaderPreference = vi
      .fn()
      .mockImplementation(async (preference: unknown) => preference);
    const renderPdfPage = vi
      .fn()
      .mockImplementation(async ({ page }: { page: number }) => ({
        page,
        page_count: 3,
        image_data_url:
          page === 3
            ? "data:image/png;base64,UEFHSU5BMw=="
            : "data:image/png;base64,UEFHSU5BMg=="
      }));

    renderApp({
      importTextBook,
      chunkTextDocument,
      loadPdfReaderPreference,
      savePdfReaderPreference,
      renderPdfPage
    });

    fillImportFilePath("/tmp/position.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("heading", { name: "PDF original" })).toBeInTheDocument();
    await waitFor(() => {
      expect(loadPdfReaderPreference).toHaveBeenCalledWith("document-pdf-position");
    });
    await waitFor(() => {
      expect(renderPdfPage).toHaveBeenCalledWith({
        file_path: "/tmp/position.pdf",
        page: 2,
        dpi: 144
      });
    });
    expect(await screen.findByAltText("Pagina PDF 2")).toHaveStyle({ width: "125%" });

    fireEvent.click(screen.getByRole("button", { name: "Proxima pagina do PDF" }));

    await waitFor(() => {
      expect(savePdfReaderPreference).toHaveBeenCalledWith({
        document_id: "document-pdf-position",
        page: 3,
        zoom: 1.25,
        reader_page: 1
      });
    });
  });

  it("keeps an imported PDF available when reader preference loading fails", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-pdf-preference-fallback",
      book_id: "book-pdf-preference-fallback",
      content: "Texto extraido via OCR.",
      language: "Pt",
      source_type: "pdf",
      source_path: "/tmp/ocr-fallback.pdf"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });
    const loadPdfReaderPreference = vi.fn().mockRejectedValue(new Error("storage failed"));
    const renderPdfPage = vi.fn().mockResolvedValue({
      page: 1,
      page_count: 1,
      image_data_url: "data:image/png;base64,UEFHSU5BMQ=="
    });

    renderApp({
      importTextBook,
      chunkTextDocument,
      loadPdfReaderPreference,
      renderPdfPage
    });

    fillImportFilePath("/tmp/ocr-fallback.pdf");
    fireEvent.click(screen.getByLabelText("Ativar OCR para PDF digitalizado"));
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("heading", { name: "PDF original" })).toBeInTheDocument();
    await waitFor(() => {
      expect(loadPdfReaderPreference).toHaveBeenCalledWith("document-pdf-preference-fallback");
    });
    expect(
      screen.queryByText("Nao foi possivel carregar a posicao do leitor PDF.")
    ).not.toBeInTheDocument();
    expect(await screen.findByAltText("Pagina PDF 1")).toBeInTheDocument();
    expect(renderPdfPage).toHaveBeenCalledWith({
      file_path: "/tmp/ocr-fallback.pdf",
      page: 1,
      dpi: 144
    });
  });

  it("paginates the full imported document in the reader", async () => {
    const finalLine = "Fim integral do livro.";
    const textIncludes = (text: string) => (_content: string, node: Element | null) =>
      node?.textContent?.includes(text) ?? false;
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-reader-pages",
      book_id: "book-reader-pages",
      content: `Inicio do livro.\n\n${"Conteudo de pagina longa. ".repeat(180)}\n\n${finalLine}`,
      language: "Pt",
      source_type: "pdf",
      source_path: "/tmp/full-book.pdf"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });

    renderApp({
      importTextBook,
      chunkTextDocument
    });

    fillImportFilePath("/tmp/full-book.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    const readerHeading = await screen.findByRole("heading", { name: "Leitura do documento" });
    const reader = readerHeading.closest(".document-reader");
    expect(reader).not.toBeNull();
    const readerQueries = within(reader as HTMLElement);

    fireEvent.click(readerQueries.getByRole("button", { name: "Mostrar idioma original" }));
    expect(readerQueries.getAllByText(textIncludes("Inicio do livro.")).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pagina 1 de/)).toBeInTheDocument();
    expect(readerQueries.queryAllByText(textIncludes(finalLine))).toHaveLength(0);

    for (
      let attempts = 0;
      attempts < 8 && readerQueries.queryAllByText(textIncludes(finalLine)).length === 0;
      attempts += 1
    ) {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Proxima pagina" }));
      });
    }

    expect(readerQueries.getAllByText(textIncludes(finalLine)).length).toBeGreaterThan(0);
  });

  it("restores and updates the document reader bookmark", async () => {
    const secondPageLine = "Conteudo retomado pelo marcador.";
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-reader-bookmark",
      book_id: "book-reader-bookmark",
      content: `${"A".repeat(1180)}\n\n${secondPageLine}\n\n${"Terceira pagina de leitura. ".repeat(90)}`,
      language: "Pt",
      source_type: "txt",
      source_path: "/tmp/bookmark.txt"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });
    const loadPdfReaderPreference = vi.fn().mockResolvedValue({
      document_id: "document-reader-bookmark",
      page: 1,
      zoom: 1,
      reader_page: 2
    });
    const savePdfReaderPreference = vi
      .fn()
      .mockImplementation(async (preference: unknown) => preference);

    renderApp({
      importTextBook,
      chunkTextDocument,
      loadPdfReaderPreference,
      savePdfReaderPreference
    });

    fillImportFilePath("/tmp/bookmark.txt");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    const readerHeading = await screen.findByRole("heading", { name: "Leitura do documento" });
    const reader = readerHeading.closest(".document-reader");
    expect(reader).not.toBeNull();
    const readerQueries = within(reader as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText(/Marcador: pagina 2 de/)).toBeInTheDocument();
    });
    fireEvent.click(readerQueries.getByRole("button", { name: "Mostrar idioma original" }));
    expect(screen.getByText(secondPageLine)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Proxima pagina" }));

    await waitFor(() => {
      expect(savePdfReaderPreference).toHaveBeenCalledWith(
        expect.objectContaining({
          document_id: "document-reader-bookmark",
          reader_page: 3
        })
      );
    });
  });

  it("keeps translation available when the imported document language metadata is wrong", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-english",
      book_id: "book-english",
      content:
        "This book is dedicated to all the people and this content is for study with technical notes.",
      language: "Pt",
      source_type: "pdf",
      source_path: "/tmp/english-book.pdf"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });
    const translateDocument = vi.fn().mockResolvedValue({
      document_id: "document-english",
      source_language: "En",
      target_language: "Pt",
      translated_content: "Texto traduzido para leitura."
    });

    renderApp({
      importTextBook,
      chunkTextDocument,
      translateDocument
    });

    fillImportFilePath("/tmp/english-book.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("heading", { name: "Leitura do documento" })).toBeInTheDocument();
    expect(screen.getByLabelText("Idioma de leitura")).toHaveValue("Pt");
    expect(
      screen.queryByText("O idioma escolhido e o mesmo do documento original.")
    ).not.toBeInTheDocument();

    const translateButton = screen.getByRole("button", { name: "Traduzir pagina atual" });
    expect(translateButton).toBeEnabled();
    fireEvent.click(translateButton);

    await waitFor(() => {
      expect(translateDocument).toHaveBeenCalledWith({
        document_id: "document-english",
        content:
          "This book is dedicated to all the people and this content is for study with technical notes.",
        source_language: "En",
        target_language: "Pt",
        page_index: 0
      });
    });
    expect(await screen.findByText("Texto traduzido para leitura.")).toBeInTheDocument();
  });

  it("keeps original reader pagination available when translation returns a shorter partial text", async () => {
    const finalLine = "Final original page remains available.";
    const textIncludes = (text: string) => (_content: string, node: Element | null) =>
      node?.textContent?.includes(text) ?? false;
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-partial-translation",
      book_id: "book-partial-translation",
      content: `Original beginning.\n\n${"Long original English content for the reader. ".repeat(
        160
      )}\n\n${finalLine}`,
      language: "En",
      source_type: "pdf",
      source_path: "/tmp/partial-translation.pdf"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks: [] });
    const translateDocument = vi.fn().mockResolvedValue({
      document_id: "document-partial-translation",
      source_language: "En",
      target_language: "Pt",
      translated_content: "Traducao parcial retornada pelo modelo."
    });

    renderApp({
      importTextBook,
      chunkTextDocument,
      translateDocument
    });

    fillImportFilePath("/tmp/partial-translation.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    const readerHeading = await screen.findByRole("heading", { name: "Leitura do documento" });
    const reader = readerHeading.closest(".document-reader");
    expect(reader).not.toBeNull();
    const readerQueries = within(reader as HTMLElement);

    fireEvent.change(screen.getByLabelText("Idioma de leitura"), {
      target: { value: "Pt" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Traduzir pagina atual" }));

    expect(await screen.findByText("Traducao parcial retornada pelo modelo.")).toBeInTheDocument();
    expect(translateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.not.stringContaining(finalLine),
        page_index: 0
      })
    );
    expect(screen.getByRole("button", { name: "Proxima pagina" })).toBeEnabled();

    fireEvent.click(readerQueries.getByRole("button", { name: "Mostrar idioma original" }));
    for (
      let attempts = 0;
      attempts < 8 && readerQueries.queryAllByText(textIncludes(finalLine)).length === 0;
      attempts += 1
    ) {
      fireEvent.click(screen.getByRole("button", { name: "Proxima pagina" }));
    }

    expect(readerQueries.getAllByText(textIncludes(finalLine)).length).toBeGreaterThan(0);
  });

  it("loads a persisted translation when selecting a saved document", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-translated",
          book_id: "book-translated",
          content: "Texto original salvo.",
          language: "Pt",
          source_type: "pdf",
          source_path: "/tmp/salvo.pdf"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([]);
    const listDocumentChunks = vi.fn().mockResolvedValue({ chunks: [] });
    const loadDocumentTranslation = vi.fn().mockResolvedValue({
      translation: {
        document_id: "document-translated",
        source_language: "Pt",
        target_language: "En",
        translated_content: "Previously saved translation."
      }
    });
    const translateDocument = vi.fn();

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listDocumentChunks,
      loadDocumentTranslation,
      translateDocument
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Documento 1/ }));

    await waitFor(() => {
      expect(loadDocumentTranslation).toHaveBeenCalledWith("document-translated", "En", 0);
    });
    expect(await screen.findByText("Previously saved translation.")).toBeInTheDocument();
    expect(translateDocument).not.toHaveBeenCalled();
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

    fillImportFilePath("/tmp/scanned.pdf");
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

    fillImportFilePath("/tmp/book.txt");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Gerando cards com Ollama.");
    });
    await waitFor(() => {
      expect(generateCards).toHaveBeenCalled();
    });

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

  it("shows and saves imported cards as each generated chunk completes", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-import-incremental",
      book_id: "book-import-incremental",
      content: "Conteudo importado com progresso incremental.",
      language: "Pt",
      source_type: "txt",
      source_path: "/tmp/import-incremental.txt"
    });
    const chunks = [
      {
        id: "chunk-1",
        book_id: "book-import-incremental",
        document_id: "document-import-incremental",
        position: 0,
        content: "Chunk incremental.",
        token_estimate: 2
      }
    ];
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks });
    const incrementalCard = {
      id: "card-incremental",
      bookId: "book-import-incremental",
      chunkId: "chunk-1",
      front: "Pergunta importada incremental",
      back: "Resposta importada incremental",
      tags: ["ollama"]
    };
    const saveStudyCards = vi.fn().mockImplementation(async (cards: StudyCard[]) => cards);
    const generateCards = vi.fn(
      async (
        _chunks: typeof chunks,
        options?: GenerateStudyCardsOptions
      ) => {
        await options?.onChunkCards?.([incrementalCard], { current: 1, total: 1 });

        return new Promise<StudyCard[]>(() => {
          // Keep final generation pending so only the incremental save updates the UI.
        });
      }
    );

    renderApp({
      importTextBook,
      chunkTextDocument,
      generateCards,
      saveStudyCards,
      enableDevelopmentFallback: false
    });

    fillImportFilePath("/tmp/import-incremental.txt");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

    expect(await screen.findByText("1 card gerado")).toBeInTheDocument();
    expect(screen.getByText("Pergunta importada incremental")).toBeInTheDocument();
    expect(saveStudyCards).toHaveBeenCalledWith([incrementalCard]);
  });

  it("limits initial Ollama generation to the first chunks of a large document", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-large",
      book_id: "book-large",
      content: "Conteudo grande para estudo.",
      language: "Pt"
    });
    const chunks = Array.from({ length: 5 }, (_, index) => ({
      id: `chunk-${index + 1}`,
      book_id: "book-large",
      document_id: "document-large",
      position: index,
      content: `Chunk ${index + 1}.`,
      token_estimate: 2
    }));
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks });
    const generateCards = vi.fn().mockResolvedValue([
      {
        id: "card-1",
        bookId: "book-large",
        chunkId: "chunk-1",
        front: "Pergunta 1",
        back: "Resposta 1",
        tags: ["large"]
      },
      {
        id: "card-2",
        bookId: "book-large",
        chunkId: "chunk-2",
        front: "Pergunta 2",
        back: "Resposta 2",
        tags: ["large"]
      },
      {
        id: "card-3",
        bookId: "book-large",
        chunkId: "chunk-3",
        front: "Pergunta 3",
        back: "Resposta 3",
        tags: ["large"]
      }
    ]);

    renderApp({
      importTextBook,
      chunkTextDocument,
      generateCards,
      saveStudyCards: saveCards,
      enableDevelopmentFallback: false
    });

    fillImportFilePath("/tmp/large.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

    await waitFor(() => {
      expect(generateCards).toHaveBeenCalledWith(
        chunks.slice(0, 3),
        expect.objectContaining({ onProgress: expect.any(Function) })
      );
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Para evitar travamentos, foram gerados cards dos 3 primeiros chunks de 5."
    );
    expect(screen.getByText("5 chunks gerados")).toBeInTheDocument();
    expect(screen.getByText("3 cards gerados")).toBeInTheDocument();
  });

  it("generates more cards from remaining chunks on demand", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-more",
      book_id: "book-more",
      content: "Conteudo grande para gerar em etapas.",
      language: "Pt"
    });
    const chunks = Array.from({ length: 5 }, (_, index) => ({
      id: `chunk-${index + 1}`,
      book_id: "book-more",
      document_id: "document-more",
      position: index,
      content: `Chunk ${index + 1}.`,
      token_estimate: 2
    }));
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks });
    const listDocumentChunks = vi.fn().mockResolvedValue({ chunks });
    const generateCards = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: "card-1",
          bookId: "book-more",
          chunkId: "chunk-1",
          front: "Pergunta 1",
          back: "Resposta 1",
          tags: ["more"]
        },
        {
          id: "card-2",
          bookId: "book-more",
          chunkId: "chunk-2",
          front: "Pergunta 2",
          back: "Resposta 2",
          tags: ["more"]
        },
        {
          id: "card-3",
          bookId: "book-more",
          chunkId: "chunk-3",
          front: "Pergunta 3",
          back: "Resposta 3",
          tags: ["more"]
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "card-4",
          bookId: "book-more",
          chunkId: "chunk-4",
          front: "Pergunta 4",
          back: "Resposta 4",
          tags: ["more"]
        },
        {
          id: "card-5",
          bookId: "book-more",
          chunkId: "chunk-5",
          front: "Pergunta 5",
          back: "Resposta 5",
          tags: ["more"]
        }
      ]);

    renderApp({
      importTextBook,
      chunkTextDocument,
      listDocumentChunks,
      generateCards,
      saveStudyCards: saveCards,
      enableDevelopmentFallback: false
    });

    fillImportFilePath("/tmp/more.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

    expect(await screen.findByText("3 cards gerados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar mais cards" }));

    await waitFor(() => {
      expect(generateCards).toHaveBeenLastCalledWith(
        chunks.slice(3, 5),
        expect.objectContaining({ onProgress: expect.any(Function) })
      );
    });
    expect(await screen.findByText("5 cards gerados")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gerar mais cards" })).not.toBeInTheDocument();
  });

  it("shows and saves additional cards as each generated chunk completes", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-more-incremental",
      book_id: "book-more-incremental",
      content: "Conteudo grande para progresso incremental.",
      language: "Pt"
    });
    const chunks = Array.from({ length: 4 }, (_, index) => ({
      id: `chunk-${index + 1}`,
      book_id: "book-more-incremental",
      document_id: "document-more-incremental",
      position: index,
      content: `Chunk ${index + 1}.`,
      token_estimate: 2
    }));
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks });
    const listDocumentChunks = vi.fn().mockResolvedValue({ chunks });
    const incrementalCard = {
      id: "card-4",
      bookId: "book-more-incremental",
      chunkId: "chunk-4",
      front: "Pergunta incremental",
      back: "Resposta incremental",
      tags: ["more"]
    };
    const saveStudyCards = vi.fn().mockImplementation(async (cards: StudyCard[]) => cards);
    const generateCards = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: "card-1",
          bookId: "book-more-incremental",
          chunkId: "chunk-1",
          front: "Pergunta 1",
          back: "Resposta 1",
          tags: ["more"]
        },
        {
          id: "card-2",
          bookId: "book-more-incremental",
          chunkId: "chunk-2",
          front: "Pergunta 2",
          back: "Resposta 2",
          tags: ["more"]
        },
        {
          id: "card-3",
          bookId: "book-more-incremental",
          chunkId: "chunk-3",
          front: "Pergunta 3",
          back: "Resposta 3",
          tags: ["more"]
        }
      ])
      .mockImplementationOnce(
        async (
          _chunks: typeof chunks,
          options?: GenerateStudyCardsOptions
        ) => {
          await options?.onChunkCards?.([incrementalCard], { current: 1, total: 1 });

          return new Promise<StudyCard[]>(() => {
            // Keep final generation pending so only the incremental save updates the UI.
          });
        }
      );

    renderApp({
      importTextBook,
      chunkTextDocument,
      listDocumentChunks,
      generateCards,
      saveStudyCards,
      enableDevelopmentFallback: false
    });

    fillImportFilePath("/tmp/incremental.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

    expect(await screen.findByText("3 cards gerados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar mais cards" }));

    expect(await screen.findByText("4 cards gerados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Proximo card" }));
    fireEvent.click(screen.getByRole("button", { name: "Proximo card" }));
    fireEvent.click(screen.getByRole("button", { name: "Proximo card" }));
    expect(screen.getByText("Pergunta incremental")).toBeInTheDocument();
    expect(saveStudyCards).toHaveBeenLastCalledWith([incrementalCard]);
  });

  it("keeps partially saved additional cards when generation fails later", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-more-partial",
      book_id: "book-more-partial",
      content: "Conteudo grande para falha parcial adicional.",
      language: "Pt"
    });
    const chunks = Array.from({ length: 4 }, (_, index) => ({
      id: `chunk-${index + 1}`,
      book_id: "book-more-partial",
      document_id: "document-more-partial",
      position: index,
      content: `Chunk ${index + 1}.`,
      token_estimate: 2
    }));
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks });
    const listDocumentChunks = vi.fn().mockResolvedValue({ chunks });
    const partialAdditionalCard = {
      id: "card-4",
      bookId: "book-more-partial",
      chunkId: "chunk-4",
      front: "Pergunta adicional parcial",
      back: "Resposta adicional parcial",
      tags: ["more"]
    };
    const saveStudyCards = vi.fn().mockImplementation(async (cards: StudyCard[]) => cards);
    const generateCards = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: "card-1",
          bookId: "book-more-partial",
          chunkId: "chunk-1",
          front: "Pergunta 1",
          back: "Resposta 1",
          tags: ["more"]
        },
        {
          id: "card-2",
          bookId: "book-more-partial",
          chunkId: "chunk-2",
          front: "Pergunta 2",
          back: "Resposta 2",
          tags: ["more"]
        },
        {
          id: "card-3",
          bookId: "book-more-partial",
          chunkId: "chunk-3",
          front: "Pergunta 3",
          back: "Resposta 3",
          tags: ["more"]
        }
      ])
      .mockImplementationOnce(
        async (
          _chunks: typeof chunks,
          options?: GenerateStudyCardsOptions
        ) => {
          await options?.onChunkCards?.([partialAdditionalCard], { current: 1, total: 1 });
          throw new Error("Falha depois do card adicional.");
        }
      );

    renderApp({
      importTextBook,
      chunkTextDocument,
      listDocumentChunks,
      generateCards,
      saveStudyCards,
      enableDevelopmentFallback: false
    });

    fillImportFilePath("/tmp/more-partial.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

    expect(await screen.findByText("3 cards gerados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar mais cards" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A geracao parou, mas 1 card ja foi salvo."
    );
    expect(screen.getByText("4 cards gerados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Proximo card" }));
    fireEvent.click(screen.getByRole("button", { name: "Proximo card" }));
    fireEvent.click(screen.getByRole("button", { name: "Proximo card" }));
    expect(screen.getByText("Pergunta adicional parcial")).toBeInTheDocument();
    expect(screen.queryByText("Falha depois do card adicional.")).not.toBeInTheDocument();
  });

  it("cancels pending additional card generation and ignores late results", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-more-cancel",
      book_id: "book-more-cancel",
      content: "Conteudo grande para cancelar geracao adicional.",
      language: "Pt"
    });
    const chunks = Array.from({ length: 4 }, (_, index) => ({
      id: `chunk-${index + 1}`,
      book_id: "book-more-cancel",
      document_id: "document-more-cancel",
      position: index,
      content: `Chunk ${index + 1}.`,
      token_estimate: 2
    }));
    const chunkTextDocument = vi.fn().mockResolvedValue({ chunks });
    const listDocumentChunks = vi.fn().mockResolvedValue({ chunks });
    let resolveAdditionalCards: (cards: StudyCard[]) => void = () => {};
    const generateCards = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: "card-1",
          bookId: "book-more-cancel",
          chunkId: "chunk-1",
          front: "Pergunta 1",
          back: "Resposta 1",
          tags: ["more"]
        },
        {
          id: "card-2",
          bookId: "book-more-cancel",
          chunkId: "chunk-2",
          front: "Pergunta 2",
          back: "Resposta 2",
          tags: ["more"]
        },
        {
          id: "card-3",
          bookId: "book-more-cancel",
          chunkId: "chunk-3",
          front: "Pergunta 3",
          back: "Resposta 3",
          tags: ["more"]
        }
      ])
      .mockImplementationOnce(
        () =>
          new Promise<StudyCard[]>((resolve) => {
            resolveAdditionalCards = resolve;
          })
      );

    renderApp({
      importTextBook,
      chunkTextDocument,
      listDocumentChunks,
      generateCards,
      saveStudyCards: saveCards,
      enableDevelopmentFallback: false
    });

    fillImportFilePath("/tmp/more-cancel.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

    expect(await screen.findByText("3 cards gerados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar mais cards" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Gerando cards com Ollama.");
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar operacao" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Operacao cancelada.");
    resolveAdditionalCards([
      {
        id: "card-4",
        bookId: "book-more-cancel",
        chunkId: "chunk-4",
        front: "Pergunta 4",
        back: "Resposta 4",
        tags: ["more"]
      }
    ]);

    await waitFor(() => {
      expect(screen.getByText("3 cards gerados")).toBeInTheDocument();
    });
    expect(screen.queryByText("Pergunta 4")).not.toBeInTheDocument();
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

    fillImportFilePath("/tmp/book.txt");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

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

    fillImportFilePath("/tmp/book.txt");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

    expect(await screen.findByText("Pergunta 1")).toBeInTheDocument();
    expect(screen.queryByText("Resposta 1")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Card anterior" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Revelar resposta" }));

    expect(screen.getByText("Resposta 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Proximo card" }));

    expect(screen.getByText("Pergunta 2")).toBeInTheDocument();
    expect(screen.queryByText("Resposta 1")).not.toBeInTheDocument();
    expect(screen.getByText("Card 2 de 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Card anterior" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Card anterior" }));

    expect(screen.getByText("Pergunta 1")).toBeInTheDocument();
    expect(screen.queryByText("Resposta 1")).not.toBeInTheDocument();
    expect(screen.getByText("Card 1 de 2")).toBeInTheDocument();
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

    fillImportFilePath("/tmp/book.txt");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

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
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Algebra linear/ }));
    expect(await screen.findByAltText("Pagina PDF 1")).toBeInTheDocument();
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
        session_id: "session-pdf-report-1",
        document_id: "document-pdf-report",
        started_at: 1700000000,
        again_count: 1,
        hard_count: 0,
        easy_count: 4
      },
      {
        session_id: "session-pdf-report-2",
        document_id: "document-pdf-report",
        started_at: 1700086400,
        again_count: 1,
        hard_count: 1,
        easy_count: 2
      }
    ]);

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listStudySessionSummaries,
      printStudySessionReport
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Historia geral/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Previa PDF" }));

    expect(await screen.findByText("Previa do PDF")).toBeInTheDocument();
    expect(screen.getByTitle("Previa do relatorio PDF")).toHaveAttribute(
      "srcdoc",
      expect.stringContaining("<title>Relatorio de estudo - Historia geral</title>")
    );
    expect(printStudySessionReport).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("button", { name: "Exportar PDF" }));

    expect(printStudySessionReport).toHaveBeenCalledWith(
      "relatorio-estudo-document-pdf-report.pdf",
      expect.stringContaining("<title>Relatorio de estudo - Historia geral</title>")
    );
    expect(printStudySessionReport.mock.calls[0][1]).toContain('<header class="report-cover">');
    expect(printStudySessionReport.mock.calls[0][1]).toContain("<h1>Relatorio de estudo - Historia geral</h1>");
    expect(printStudySessionReport.mock.calls[0][1]).toContain("@bottom-center");
    expect(printStudySessionReport.mock.calls[0][1]).toContain("counter(page)");
    expect(printStudySessionReport.mock.calls[0][1]).toContain("break-inside: avoid");
    expect(printStudySessionReport.mock.calls[0][1]).toContain('<section class="performance-chart"');
    expect(printStudySessionReport.mock.calls[0][1]).toContain('class="chart-bar easy" style="width: 67%"');
    expect(printStudySessionReport.mock.calls[0][1]).toContain('class="chart-bar again" style="width: 22%"');
    expect(printStudySessionReport.mock.calls[0][1]).toContain('<section class="session-trend-chart"');
    expect(printStudySessionReport.mock.calls[0][1]).toContain("Sessao 1");
    expect(printStudySessionReport.mock.calls[0][1]).toContain("Sessao 2");
    expect(printStudySessionReport.mock.calls[0][1]).toContain("80% acertos");
    expect(printStudySessionReport.mock.calls[0][1]).toContain("50% acertos");
    expect(printStudySessionReport.mock.calls[0][1]).toContain("<strong>Acertos</strong>");
    expect(printStudySessionReport.mock.calls[0][1]).toContain("<span>6</span>");
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
    selectLibraryCategory();

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
    selectLibraryCategory();

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
    selectLibraryCategory();

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

  it("tracks a review goal for the active document", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-goal",
          book_id: "book-goal",
          content: "Literatura brasileira.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/literatura.txt"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([
      {
        id: "card-goal",
        bookId: "book-goal",
        chunkId: "chunk-goal",
        front: "Quem escreveu Dom Casmurro?",
        back: "Machado de Assis.",
        tags: ["literatura"]
      }
    ]);
    const listStudySessionSummaries = vi.fn().mockResolvedValue([
      {
        session_id: "session-goal",
        document_id: "document-goal",
        started_at: 1700000000,
        again_count: 1,
        hard_count: 0,
        easy_count: 2
      }
    ]);

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listStudySessionSummaries
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Literatura brasileira/ }));
    fireEvent.change(await screen.findByLabelText("Meta de revisoes"), {
      target: { value: "5" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar meta" }));

    expect(screen.getByText("Meta do documento")).toBeInTheDocument();
    expect(await screen.findByText("3 de 5 revisoes")).toBeInTheDocument();
    expect(screen.getByText("60% concluido")).toBeInTheDocument();
  });

  it("loads and saves a persisted review goal for the active document", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-persisted-goal",
          book_id: "book-persisted-goal",
          content: "Arte moderna.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/arte.txt"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([
      {
        id: "card-persisted-goal",
        bookId: "book-persisted-goal",
        chunkId: "chunk-persisted-goal",
        front: "O que e modernismo?",
        back: "Movimento artistico e cultural.",
        tags: ["arte"]
      }
    ]);
    const listStudySessionSummaries = vi.fn().mockResolvedValue([
      {
        session_id: "session-persisted-goal",
        document_id: "document-persisted-goal",
        started_at: 1700000000,
        again_count: 0,
        hard_count: 1,
        easy_count: 2
      }
    ]);
    const loadStudyGoal = vi.fn().mockResolvedValue({
      document_id: "document-persisted-goal",
      target_reviews: 6,
      recurrence: "all"
    });
    const saveStudyGoal = vi.fn().mockResolvedValue({
      document_id: "document-persisted-goal",
      target_reviews: 4,
      recurrence: "all"
    });

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listStudySessionSummaries,
      loadStudyGoal,
      saveStudyGoal
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Arte moderna/ }));

    expect(await screen.findByText("3 de 6 revisoes")).toBeInTheDocument();
    expect(loadStudyGoal).toHaveBeenCalledWith("document-persisted-goal");

    fireEvent.change(screen.getByLabelText("Meta de revisoes"), {
      target: { value: "4" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar meta" }));

    await waitFor(() => {
      expect(saveStudyGoal).toHaveBeenCalledWith("document-persisted-goal", 4, "all");
    });
    expect(await screen.findByText("3 de 4 revisoes")).toBeInTheDocument();
  });

  it("tracks a weekly review goal using only recent study sessions", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-weekly-goal",
          book_id: "book-weekly-goal",
          content: "Matematica aplicada.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/matematica.txt"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([
      {
        id: "card-weekly-goal",
        bookId: "book-weekly-goal",
        chunkId: "chunk-weekly-goal",
        front: "O que e uma funcao?",
        back: "Relacao entre conjuntos.",
        tags: ["matematica"]
      }
    ]);
    const listStudySessionSummaries = vi.fn().mockResolvedValue([
      {
        session_id: "session-weekly-goal-recent",
        document_id: "document-weekly-goal",
        started_at: nowSeconds - 60,
        again_count: 1,
        hard_count: 0,
        easy_count: 2
      },
      {
        session_id: "session-weekly-goal-old",
        document_id: "document-weekly-goal",
        started_at: nowSeconds - 10 * 24 * 60 * 60,
        again_count: 0,
        hard_count: 1,
        easy_count: 4
      }
    ]);
    const saveStudyGoal = vi.fn().mockResolvedValue({
      document_id: "document-weekly-goal",
      target_reviews: 6,
      recurrence: "weekly"
    });
    const notifyStudyGoalReminder = vi.fn();

    renderApp({
      listImportedDocuments,
      listStudyCards,
      listStudySessionSummaries,
      saveStudyGoal,
      notifyStudyGoalReminder
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Matematica aplicada/ }));
    fireEvent.change(await screen.findByLabelText("Meta de revisoes"), {
      target: { value: "6" }
    });
    fireEvent.change(screen.getByLabelText("Periodo da meta"), {
      target: { value: "weekly" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar meta" }));

    await waitFor(() => {
      expect(saveStudyGoal).toHaveBeenCalledWith("document-weekly-goal", 6, "weekly");
    });
    expect(notifyStudyGoalReminder).toHaveBeenCalledWith({
      title: "Meta de estudo pendente",
      body: "Faltam 3 revisoes para cumprir a meta de 7 dias.",
      recurrence: "weekly",
      reminderTime: "08:00"
    });
    expect(await screen.findByText("3 de 6 revisoes")).toBeInTheDocument();
    expect(screen.getByText("50% concluido")).toBeInTheDocument();
    expect(
      screen.getByText("Faltam 3 revisoes para cumprir a meta de 7 dias.")
    ).toBeInTheDocument();
  });

  it("disables persisted study goal reminders from the goal panel", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-disabled-reminder",
          book_id: "book-disabled-reminder",
          content: "Fisica basica.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/fisica.txt"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([
      {
        id: "card-disabled-reminder",
        bookId: "book-disabled-reminder",
        chunkId: "chunk-disabled-reminder",
        front: "O que e energia?",
        back: "Capacidade de realizar trabalho.",
        tags: ["fisica"]
      }
    ]);
    const saveNotificationSettings = vi.fn().mockResolvedValue({
      study_goal_reminders_enabled: false,
      study_goal_reminder_time: "08:00"
    });
    const saveStudyGoal = vi.fn().mockResolvedValue({
      document_id: "document-disabled-reminder",
      target_reviews: 4,
      recurrence: "weekly"
    });
    const notifyStudyGoalReminder = vi.fn();
    const cancelStudyGoalReminder = vi.fn();

    renderApp({
      listImportedDocuments,
      listStudyCards,
      saveNotificationSettings,
      saveStudyGoal,
      notifyStudyGoalReminder,
      cancelStudyGoalReminder
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Fisica basica/ }));
    fireEvent.click(await screen.findByLabelText("Ativar lembretes de meta"));
    fireEvent.change(await screen.findByLabelText("Meta de revisoes"), {
      target: { value: "4" }
    });
    fireEvent.change(screen.getByLabelText("Periodo da meta"), {
      target: { value: "weekly" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar meta" }));

    await waitFor(() => {
      expect(saveNotificationSettings).toHaveBeenCalledWith({
        study_goal_reminders_enabled: false,
        study_goal_reminder_time: "08:00"
      });
    });
    await waitFor(() => {
      expect(saveStudyGoal).toHaveBeenCalledWith("document-disabled-reminder", 4, "weekly");
    });
    expect(notifyStudyGoalReminder).not.toHaveBeenCalled();
    expect(cancelStudyGoalReminder).toHaveBeenCalled();
  });

  it("persists the study goal reminder time", async () => {
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-reminder-time",
          book_id: "book-reminder-time",
          content: "Quimica organica.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/quimica.txt"
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([
      {
        id: "card-reminder-time",
        bookId: "book-reminder-time",
        chunkId: "chunk-reminder-time",
        front: "O que e carbono?",
        back: "Elemento quimico de numero atomico 6.",
        tags: ["quimica"]
      }
    ]);
    const saveNotificationSettings = vi
      .fn()
      .mockImplementation(async (settings: unknown) => settings);

    renderApp({
      listImportedDocuments,
      listStudyCards,
      saveNotificationSettings
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Quimica organica/ }));
    fireEvent.change(await screen.findByLabelText("Horario do lembrete"), {
      target: { value: "19:30" }
    });

    await waitFor(() => {
      expect(saveNotificationSettings).toHaveBeenCalledWith({
        study_goal_reminders_enabled: true,
        study_goal_reminder_time: "19:30"
      });
    });
  });

  it("exports study cards as an Anki APKG package", async () => {
    const exportAnkiPackage = vi.fn().mockResolvedValue({
      file_path: "/tmp/anki-document-anki.apkg",
      card_count: 2
    });
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
    const cards = [
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
    ];
    const listStudyCards = vi.fn().mockResolvedValue(cards);

    renderApp({
      exportAnkiPackage,
      listImportedDocuments,
      listStudyCards
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Biologia celular/ }));
    expect(await screen.findByText(/O que e celula/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Exportar Anki .apkg" }));

    expect(exportAnkiPackage).toHaveBeenCalledWith(
      "anki-document-anki.apkg",
      "Biologia celular.",
      cards
    );
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
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Biologia celular/ }));
    expect(await screen.findByText(/O que e celula/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Exportar Anki TSV" }));

    expect(downloadTextFile).toHaveBeenCalledWith(
      "anki-document-anki.tsv",
      [
        "#separator:tab",
        "#html:false",
        "#notetype:Basic",
        "#guid column:1",
        "#columns:GUID Front Back Tags",
        "estudo_ia_local_card-1\tO que e celula? Explique.\tUnidade basica da vida.\testudo_ia_local document_document-anki source_txt biologia celula_animal",
        "estudo_ia_local_card-2\tFuncao da mitocondria?\tProduzir energia.\testudo_ia_local document_document-anki source_txt biologia"
      ].join("\n")
    );
  });

  it("keeps meditation notes collapsed and supports add, edit and delete actions", async () => {
    const loadMeditationNotes = vi.fn().mockResolvedValue({
      document_id: "document-meditation",
      notes: [
        {
          id: "note-1",
          content: "Resumo inicial do leitor.",
          created_at: "2026-05-19T14:00:00Z"
        }
      ]
    });
    const addMeditationNote = vi.fn().mockResolvedValue({
      document_id: "document-meditation",
      notes: [
        {
          id: "note-1",
          content: "Resumo inicial do leitor.",
          created_at: "2026-05-19T14:00:00Z"
        },
        {
          id: "note-2",
          content: "Agora entendi os conceitos principais.",
          created_at: "2026-05-19T14:20:00Z"
        }
      ]
    });
    const updateMeditationNote = vi.fn().mockResolvedValue({
      document_id: "document-meditation",
      notes: [
        {
          id: "note-1",
          content: "Resumo inicial revisado.",
          created_at: "2026-05-19T14:00:00Z"
        },
        {
          id: "note-2",
          content: "Agora entendi os conceitos principais.",
          created_at: "2026-05-19T14:20:00Z"
        }
      ]
    });
    const deleteMeditationNote = vi.fn().mockResolvedValue({
      document_id: "document-meditation",
      notes: [
        {
          id: "note-1",
          content: "Resumo inicial revisado.",
          created_at: "2026-05-19T14:00:00Z"
        }
      ]
    });
    const confirmDelete = vi.fn().mockReturnValue(true);
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-meditation",
          book_id: "book-meditation",
          content: "Conteudo sobre redes.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/redes.txt"
        }
      ]
    });

    renderApp({
      listImportedDocuments,
      loadMeditationNotes,
      addMeditationNote,
      updateMeditationNote,
      deleteMeditationNote,
      confirmDelete
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Conteudo sobre redes/ }));
    const readerHeading = await screen.findByRole("heading", { name: "Leitura do documento" });
    const reader = readerHeading.closest(".document-reader");
    expect(reader).not.toBeNull();
    const readerQueries = within(reader as HTMLElement);

    const meditationToggle = readerQueries.getByRole("button", { name: "Abrir anotacao" });
    expect(screen.queryByRole("dialog", { name: "Anotacao" })).not.toBeInTheDocument();
    expect(readerQueries.queryByText("Anotacao 1")).not.toBeInTheDocument();
    expect(readerQueries.queryByText("Resumo inicial do leitor.")).not.toBeInTheDocument();

    fireEvent.click(meditationToggle);
    const meditationDialog = await screen.findByRole("dialog", { name: "Anotacao" });
    const meditationQueries = within(meditationDialog);
    expect(meditationQueries.getByText("Anotacao 1")).toBeInTheDocument();
    expect(meditationQueries.getByText("Resumo inicial do leitor.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Anotacao do documento")).not.toBeInTheDocument();

    fireEvent.click(meditationQueries.getByRole("button", { name: "Adicionar anotacao" }));
    expect(screen.getByLabelText("Anotacao do documento")).toHaveValue("");

    fireEvent.change(screen.getByLabelText("Anotacao do documento"), {
      target: { value: "Agora entendi os conceitos principais." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar anotacao" }));

    await waitFor(() => {
      expect(addMeditationNote).toHaveBeenCalledWith(
        "document-meditation",
        "Agora entendi os conceitos principais."
      );
    });
    expect(await screen.findByText("Anotacao adicionada.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Anotacao do documento")).not.toBeInTheDocument();
    expect(meditationQueries.getByText("Anotacao 2")).toBeInTheDocument();
    expect(meditationQueries.getByText("Agora entendi os conceitos principais.")).toBeInTheDocument();

    const firstMeditation = meditationQueries.getByText("Resumo inicial do leitor.").closest("li");
    expect(firstMeditation).not.toBeNull();
    fireEvent.click(within(firstMeditation as HTMLElement).getByRole("button", { name: "Editar anotacao" }));
    expect(screen.getByLabelText("Anotacao do documento")).toHaveValue("Resumo inicial do leitor.");

    fireEvent.change(screen.getByLabelText("Anotacao do documento"), {
      target: { value: "Resumo inicial revisado." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar anotacao" }));

    await waitFor(() => {
      expect(updateMeditationNote).toHaveBeenCalledWith(
        "document-meditation",
        "note-1",
        "Resumo inicial revisado."
      );
    });
    expect(await screen.findByText("Anotacao atualizada.")).toBeInTheDocument();
    expect(meditationQueries.getByText("Resumo inicial revisado.")).toBeInTheDocument();

    const secondMeditation = meditationQueries
      .getByText("Agora entendi os conceitos principais.")
      .closest("li");
    expect(secondMeditation).not.toBeNull();
    fireEvent.click(within(secondMeditation as HTMLElement).getByRole("button", { name: "Excluir anotacao" }));

    expect(confirmDelete).toHaveBeenCalledWith("Excluir esta anotacao?");
    await waitFor(() => {
      expect(deleteMeditationNote).toHaveBeenCalledWith("document-meditation", "note-2");
    });
    expect(await screen.findByText("Anotacao excluida.")).toBeInTheDocument();
    expect(meditationQueries.queryByText("Agora entendi os conceitos principais.")).not.toBeInTheDocument();
  });

  it("deletes generated cards from the active document after confirmation", async () => {
    const confirmDelete = vi.fn().mockReturnValue(true);
    const deleteStudyCards = vi.fn().mockResolvedValue({
      document_id: "document-delete-cards",
      deleted_cards: 1
    });
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-delete-cards",
          book_id: "book-delete-cards",
          content: "Documento com cards para excluir.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/cards.txt"
        }
      ]
    });
    const listDocumentChunks = vi.fn().mockResolvedValue({
      chunks: [
        {
          id: "chunk-delete-cards",
          book_id: "book-delete-cards",
          document_id: "document-delete-cards",
          position: 0,
          content: "Documento com cards para excluir.",
          token_estimate: 6
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([
      {
        id: "card-delete",
        bookId: "book-delete-cards",
        chunkId: "chunk-delete-cards",
        front: "Pergunta para excluir",
        back: "Resposta para excluir.",
        tags: ["teste"]
      }
    ]);
    const listStudyReviews = vi.fn().mockResolvedValue([
      {
        id: "review-delete",
        card_id: "card-delete",
        session_id: "session-delete",
        rating: "easy",
        priority: 20,
        next_review_at: 1700604800
      }
    ]);
    const listStudySessionSummaries = vi.fn().mockResolvedValue([
      {
        session_id: "session-delete",
        document_id: "document-delete-cards",
        started_at: 1700000000,
        again_count: 0,
        hard_count: 0,
        easy_count: 1
      }
    ]);

    renderApp({
      confirmDelete,
      deleteStudyCards,
      listImportedDocuments,
      listDocumentChunks,
      listStudyCards,
      listStudyReviews,
      listStudySessionSummaries
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Documento com cards/ }));
    expect((await screen.findAllByText("Pergunta para excluir")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Excluir cards" }));

    await waitFor(() => {
      expect(confirmDelete).toHaveBeenCalledWith(
        "Excluir todos os cards e revisoes deste documento? O texto importado sera mantido."
      );
      expect(deleteStudyCards).toHaveBeenCalledWith("document-delete-cards");
    });
    expect(screen.queryAllByText("Pergunta para excluir")).toHaveLength(0);
    expect(screen.getByText(/0 card/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gerar cards" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Exportar Anki" })).not.toBeInTheDocument();
  });

  it("keeps generated cards when deletion is not confirmed", async () => {
    const confirmDelete = vi.fn().mockReturnValue(false);
    const deleteStudyCards = vi.fn();
    const listImportedDocuments = vi.fn().mockResolvedValue({
      documents: [
        {
          document_id: "document-keep-cards",
          book_id: "book-keep-cards",
          content: "Documento com cards preservados.",
          language: "Pt",
          source_type: "txt",
          source_path: "/tmp/cards.txt"
        }
      ]
    });
    const listDocumentChunks = vi.fn().mockResolvedValue({
      chunks: [
        {
          id: "chunk-keep-cards",
          book_id: "book-keep-cards",
          document_id: "document-keep-cards",
          position: 0,
          content: "Documento com cards preservados.",
          token_estimate: 6
        }
      ]
    });
    const listStudyCards = vi.fn().mockResolvedValue([
      {
        id: "card-keep",
        bookId: "book-keep-cards",
        chunkId: "chunk-keep-cards",
        front: "Pergunta preservada",
        back: "Resposta preservada.",
        tags: ["teste"]
      }
    ]);

    renderApp({
      confirmDelete,
      deleteStudyCards,
      listImportedDocuments,
      listDocumentChunks,
      listStudyCards
    });
    selectLibraryCategory();

    fireEvent.click(await screen.findByRole("button", { name: /Documento com cards/ }));
    expect(await screen.findByText("Pergunta preservada")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Excluir cards" }));

    expect(deleteStudyCards).not.toHaveBeenCalled();
    expect(screen.getByText("Pergunta preservada")).toBeInTheDocument();
  });

  it("shows an error when import fails", async () => {
    const importTextBook = vi.fn().mockRejectedValue("Arquivo de estudo nao encontrado.");

    renderApp({
      importTextBook,
      listStudyCards: listNoStudyCards
    });

    fillImportFilePath("/tmp/missing.txt");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Arquivo de estudo nao encontrado.");
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

    fillImportFilePath("/tmp/book.txt");
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
    const generateCards = vi.fn().mockRejectedValue("Modelo Ollama indisponivel.");

    renderApp({
      importTextBook,
      chunkTextDocument,
      generateCards,
      saveStudyCards: saveCards
    });

    fillImportFilePath("/tmp/book.txt");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Modelo Ollama indisponivel.");
    expect(screen.queryByText("Ollama falhou. Cards mockados foram gerados apenas para desenvolvimento.")).not.toBeInTheDocument();
  });

  it("keeps partially saved imported cards when generation fails later", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-partial",
      book_id: "book-partial",
      content: "Conteudo com geracao parcial.",
      language: "Pt",
      source_type: "txt",
      source_path: "/tmp/partial.txt"
    });
    const chunkTextDocument = vi.fn().mockResolvedValue({
      chunks: [
        {
          id: "chunk-partial",
          book_id: "book-partial",
          document_id: "document-partial",
          position: 0,
          content: "Conteudo com geracao parcial.",
          token_estimate: 4
        }
      ]
    });
    const partialCard = {
      id: "card-partial",
      bookId: "book-partial",
      chunkId: "chunk-partial",
      front: "Pergunta parcial",
      back: "Resposta parcial",
      tags: ["ollama"]
    };
    const saveStudyCards = vi.fn().mockImplementation(async (cards: StudyCard[]) => cards);
    const generateCards = vi.fn(
      async (
        _chunks: Array<{
          id: string;
          book_id: string;
          document_id: string;
          position: number;
          content: string;
          token_estimate: number;
        }>,
        options?: GenerateStudyCardsOptions
      ) => {
        await options?.onChunkCards?.([partialCard], { current: 1, total: 2 });
        throw new Error("Falha depois do primeiro card.");
      }
    );

    renderApp({
      importTextBook,
      chunkTextDocument,
      generateCards,
      saveStudyCards,
      enableDevelopmentFallback: false
    });

    fillImportFilePath("/tmp/partial.txt");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText("0 card gerado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar cards" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A geracao parou, mas 1 card ja foi salvo."
    );
    expect(screen.getByText("1 card gerado")).toBeInTheDocument();
    expect(screen.getByText("Pergunta parcial")).toBeInTheDocument();
    expect(screen.queryByText("Falha depois do primeiro card.")).not.toBeInTheDocument();
  });
});
