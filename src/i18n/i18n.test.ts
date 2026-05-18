import { describe, expect, it } from "vitest";
import i18n from ".";

describe("i18n", () => {
  it("uses Portuguese as the default language", () => {
    expect(i18n.language).toBe("pt");
    expect(i18n.t("app.title")).toBe("Estudo IA Local");
  });

  it("has English and Spanish translations for the product title", () => {
    expect(i18n.getResource("en", "translation", "app.title")).toBe("Local AI Study");
    expect(i18n.getResource("es", "translation", "app.title")).toBe("Estudio IA Local");
  });

  it("has import labels in every supported language", () => {
    expect(i18n.getResource("pt", "translation", "library.import")).toBe("Importar");
    expect(i18n.getResource("en", "translation", "library.import")).toBe("Import");
    expect(i18n.getResource("es", "translation", "library.import")).toBe("Importar");
  });

  it("has supported file labels in every supported language", () => {
    expect(i18n.getResource("pt", "translation", "library.filePathLabel")).toBe(
      "Caminho do arquivo .txt ou .pdf"
    );
    expect(i18n.getResource("en", "translation", "library.filePathLabel")).toBe(
      "Study file path"
    );
    expect(i18n.getResource("es", "translation", "library.filePathLabel")).toBe(
      "Ruta del archivo .txt o .pdf"
    );
    expect(i18n.getResource("pt", "translation", "library.chooseFile")).toBe("Selecionar");
    expect(i18n.getResource("pt", "translation", "library.ocrLabel")).toBe(
      "Ativar OCR para PDF digitalizado"
    );
    expect(i18n.getResource("pt", "translation", "library.ocrLanguageLabel")).toBe("Idioma OCR");
    expect(i18n.getResource("pt", "translation", "library.sourceType")).toBe("Origem: {{type}}");
    expect(i18n.getResource("pt", "translation", "library.fileDialogError")).toBe(
      "Nao foi possivel abrir o seletor de arquivos."
    );
  });

  it("has chunk count labels in every supported language", () => {
    expect(i18n.getResource("pt", "translation", "library.chunkCount_one")).toBe(
      "{{count}} chunk gerado"
    );
    expect(i18n.getResource("en", "translation", "library.chunkCount_one")).toBe(
      "{{count}} chunk generated"
    );
    expect(i18n.getResource("es", "translation", "library.chunkCount_one")).toBe(
      "{{count}} chunk generado"
    );
  });

  it("has card count labels in every supported language", () => {
    expect(i18n.getResource("pt", "translation", "library.cardCount_one")).toBe(
      "{{count}} card gerado"
    );
    expect(i18n.getResource("en", "translation", "library.cardCount_one")).toBe(
      "{{count}} card generated"
    );
    expect(i18n.getResource("es", "translation", "library.cardCount_one")).toBe(
      "{{count}} card generado"
    );
  });

  it("has study controls in every supported language", () => {
    expect(i18n.getResource("pt", "translation", "study.revealAnswer")).toBe(
      "Revelar resposta"
    );
    expect(i18n.getResource("en", "translation", "study.revealAnswer")).toBe("Reveal answer");
    expect(i18n.getResource("es", "translation", "study.revealAnswer")).toBe(
      "Revelar respuesta"
    );
  });

  it("has study review labels in every supported language", () => {
    expect(i18n.getResource("pt", "translation", "study.easy")).toBe("Acertei");
    expect(i18n.getResource("en", "translation", "study.easy")).toBe("Correct");
    expect(i18n.getResource("es", "translation", "study.easy")).toBe("Acerto");
    expect(i18n.getResource("pt", "translation", "study.reviewSaveError")).toBe(
      "Nao foi possivel salvar a revisao do card."
    );
    expect(i18n.getResource("pt", "translation", "study.reviewSchedule")).toBe(
      "Proxima revisao: {{nextReviewAt}} | Prioridade: {{priority}}"
    );
    expect(i18n.getResource("pt", "translation", "study.reviewHistoryTitle")).toBe(
      "Historico de revisoes"
    );
    expect(i18n.getResource("pt", "translation", "study.dueQueueTitle")).toBe(
      "Fila de revisao"
    );
    expect(i18n.getResource("pt", "translation", "study.sessionSummary_one")).toBe(
      "{{count}} revisao nesta sessao"
    );
    expect(i18n.getResource("pt", "translation", "study.sessionHistoryTitle")).toBe(
      "Sessoes de estudo"
    );
    expect(i18n.getResource("pt", "translation", "study.exportSessionReport")).toBe(
      "Exportar relatorio"
    );
    expect(i18n.getResource("pt", "translation", "study.exportAnki")).toBe("Exportar Anki");
    expect(i18n.getResource("pt", "translation", "progress.title")).toBe(
      "Progresso por documento"
    );
    expect(i18n.getResource("pt", "translation", "study.retentionTitle")).toBe("Retencao");
    expect(i18n.getResource("pt", "translation", "study.sessionTrendTitle")).toBe(
      "Tendencia por sessao"
    );
  });

  it("has saved document labels in every supported language", () => {
    expect(i18n.getResource("pt", "translation", "library.savedDocuments")).toBe(
      "Documentos salvos"
    );
    expect(i18n.getResource("en", "translation", "library.savedDocuments")).toBe(
      "Saved documents"
    );
    expect(i18n.getResource("es", "translation", "library.savedDocuments")).toBe(
      "Documentos guardados"
    );
    expect(i18n.getResource("pt", "translation", "library.sourceFilterLabel")).toBe(
      "Tipo de arquivo"
    );
    expect(i18n.getResource("pt", "translation", "library.reviewStatusFilterLabel")).toBe(
      "Status de revisao"
    );
    expect(i18n.getResource("pt", "translation", "library.searchLabel")).toBe(
      "Buscar na biblioteca"
    );
    expect(i18n.getResource("pt", "translation", "library.sortLabel")).toBe(
      "Ordenar biblioteca"
    );
    expect(i18n.getResource("pt", "translation", "library.archiveDocument")).toBe("Arquivar");
    expect(i18n.getResource("pt", "translation", "library.restoreDocument")).toBe("Restaurar");
    expect(i18n.getResource("pt", "translation", "library.deleteDocumentForever")).toBe(
      "Excluir definitivamente"
    );
  });

  it("has Ollama settings labels in every supported language", () => {
    expect(i18n.getResource("pt", "translation", "settings.testOllama")).toBe("Testar");
    expect(i18n.getResource("en", "translation", "settings.testOllama")).toBe("Test");
    expect(i18n.getResource("es", "translation", "settings.testOllama")).toBe("Probar");
    expect(i18n.getResource("pt", "translation", "settings.ocrTitle")).toBe("OCR local");
  });

  it("has operation progress labels in every supported language", () => {
    expect(i18n.getResource("pt", "translation", "library.generatingCardsWithOllama")).toBe(
      "Gerando cards com Ollama."
    );
    expect(i18n.getResource("en", "translation", "library.generatingCardsWithOllama")).toBe(
      "Generating cards with Ollama."
    );
    expect(i18n.getResource("es", "translation", "library.generatingCardsWithOllama")).toBe(
      "Generando cards con Ollama."
    );
  });

  it("has mock fallback labels in every supported language", () => {
    expect(i18n.getResource("pt", "translation", "library.mockGenerationFallback")).toBe(
      "Ollama falhou. Cards mockados foram gerados apenas para desenvolvimento."
    );
    expect(i18n.getResource("en", "translation", "library.mockGenerationFallback")).toBe(
      "Ollama failed. Mock cards were generated for development only."
    );
    expect(i18n.getResource("es", "translation", "library.mockGenerationFallback")).toBe(
      "Ollama fallo. Se generaron cards mockados solo para desarrollo."
    );
  });
});
