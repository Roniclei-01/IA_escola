import { expect, test } from "@playwright/test";

type TauriInternalsWindow = Window &
  typeof globalThis & {
    __TAURI_INTERNALS__: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      transformCallback: (callback: unknown) => number;
      unregisterCallback: (id: number) => void;
      runCallback: (id: number, payload: unknown) => void;
      callbacks: Map<number, unknown>;
      convertFileSrc: (filePath: string) => string;
      metadata: {
        currentWindow: { label: string };
        currentWebview: { label: string };
      };
    };
  };

test("opens the initial workspace", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Estudo IA Local" })).toBeVisible();
  await expect(page.getByText("MVP 0.1")).toBeVisible();
});

test("imports a document, generates a card and records a review", async ({ page }) => {
  await page.addInitScript(() => {
    const document = {
      document_id: "document-e2e",
      book_id: "book-e2e",
      content: "Conteudo de estudo importado no fluxo E2E.",
      language: "Pt",
      source_type: "txt",
      source_path: "/tmp/e2e.txt"
    };
    const chunk = {
      id: "chunk-e2e",
      book_id: "book-e2e",
      document_id: "document-e2e",
      position: 0,
      content: "Conteudo de estudo importado no fluxo E2E.",
      token_estimate: 8
    };
    const card = {
      id: "card-e2e",
      book_id: "book-e2e",
      chunk_id: "chunk-e2e",
      front: "Qual e o objetivo do fluxo E2E?",
      back: "Validar importacao, geracao de card e revisao.",
      tags: ["e2e"]
    };
    const callbacks = new Map<number, unknown>();
    let callbackId = 1;
    const tauriWindow = window as TauriInternalsWindow;

    tauriWindow.__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args?: Record<string, unknown>) => {
        switch (cmd) {
          case "list_imported_documents":
            return { documents: [] };
          case "list_archived_documents":
            return { documents: [] };
          case "load_ollama_settings":
            return { base_url: "http://127.0.0.1:11434", model: "llama3.2:1b" };
          case "load_notification_settings":
            return {
              study_goal_reminders_enabled: true,
              study_goal_reminder_time: "08:00"
            };
          case "test_ocr_dependencies":
            return { pdftoppm_available: true, tesseract_available: true };
          case "import_text_book":
            return document;
          case "chunk_text_document":
            return { chunks: [chunk] };
          case "save_document_study_metadata":
            return args?.request;
          case "load_document_study_metadata":
            return {
              document_id: "document-e2e",
              category: "Geral",
              subcategory: "Sem subcategoria",
              description: "Importado no fluxo E2E."
            };
          case "load_meditation_notes":
            return { notes: [] };
          case "load_pdf_reader_preference":
            return {
              document_id: "document-e2e",
              page: 1,
              zoom: 1,
              reader_page: 1
            };
          case "save_pdf_reader_preference":
            return args?.preference;
          case "list_document_page_translations":
            return { page_indexes: [] };
          case "load_document_translation":
            return { translation: null };
          case "load_study_goal":
            return null;
          case "list_study_cards":
            return [];
          case "list_study_reviews":
            return [];
          case "list_study_session_summaries":
            return { summaries: [] };
          case "list_document_chunks":
            return { chunks: [chunk] };
          case "generate_study_cards":
            return { cards: [card] };
          case "save_study_cards":
            return { cards: args?.cards };
          case "start_study_session":
            return {
              session: {
                id: "session-e2e",
                document_id: "document-e2e",
                started_at: 1_700_000_000
              }
            };
          case "save_study_review":
            return {
              review: {
                id: "review-e2e",
                card_id: "card-e2e",
                session_id: "session-e2e",
                rating: "easy",
                priority: 20,
                next_review_at: 1_700_604_800
              }
            };
          default:
            throw new Error(`Comando Tauri nao mockado no E2E: ${cmd}`);
        }
      },
      transformCallback: (callback: unknown) => {
        const id = callbackId;
        callbackId += 1;
        callbacks.set(id, callback);
        return id;
      },
      unregisterCallback: (id: number) => {
        callbacks.delete(id);
      },
      runCallback: (id: number, payload: unknown) => {
        const callback = callbacks.get(id);
        if (typeof callback === "function") {
          callback(payload);
        }
      },
      callbacks,
      convertFileSrc: (filePath: string) => filePath,
      metadata: {
        currentWindow: { label: "main" },
        currentWebview: { label: "main" }
      }
    };
  });

  await page.goto("/");

  await page
    .getByLabel("Importacao e IA")
    .getByRole("button", { name: "Importar livro" })
    .click();
  const importDialog = page.getByRole("dialog", { name: "Importar livro" });
  await expect(importDialog).toBeVisible();
  await importDialog.locator("#import-category").selectOption("Geral");
  await importDialog.locator("#import-subcategory").selectOption("Sem subcategoria");
  await importDialog.getByLabel("Caminho do arquivo .txt ou .pdf").fill("/tmp/e2e.txt");
  await importDialog.getByRole("button", { name: "Importar" }).click();

  await expect(page.getByText("1 chunk gerado")).toBeVisible();
  await expect(page.getByText("0 card gerado")).toBeVisible();
  await page.getByRole("button", { name: "Gerar cards" }).click();

  await expect(page.getByText("1 card gerado")).toBeVisible();
  await expect(page.getByText("Qual e o objetivo do fluxo E2E?")).toBeVisible();

  await page.getByRole("button", { name: "Revelar resposta" }).click();
  await expect(page.getByText("Validar importacao, geracao de card e revisao.")).toBeVisible();

  await page.getByRole("button", { name: "Acertei" }).click();
  await expect(
    page.getByLabel("Estudo", { exact: true }).getByText("Acertos: 1 | Erros: 0 | Dificeis: 0")
  ).toBeVisible();
});
