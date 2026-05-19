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

  it("has interface language labels in every supported language", () => {
    expect(i18n.getResource("pt", "translation", "settings.uiLanguageLabel")).toBe(
      "Idioma da interface"
    );
    expect(i18n.getResource("en", "translation", "settings.uiLanguageLabel")).toBe(
      "Interface language"
    );
    expect(i18n.getResource("es", "translation", "settings.uiLanguageLabel")).toBe(
      "Idioma de la interfaz"
    );
  });

  it("has import labels in every supported language", () => {
    expect(i18n.getResource("pt", "translation", "library.import")).toBe("Importar");
    expect(i18n.getResource("en", "translation", "library.import")).toBe("Import");
    expect(i18n.getResource("es", "translation", "library.import")).toBe("Importar");
  });

  it("has document reader labels in every supported language", () => {
    expect(i18n.getResource("pt", "translation", "library.readerTitle")).toBe(
      "Leitura do documento"
    );
    expect(i18n.getResource("en", "translation", "library.readerTitle")).toBe(
      "Document reader"
    );
    expect(i18n.getResource("es", "translation", "library.readerTitle")).toBe(
      "Lectura del documento"
    );
    expect(i18n.getResource("pt", "translation", "library.translateDocument")).toBe(
      "Traduzir pagina atual"
    );
    expect(i18n.getResource("pt", "translation", "library.retranslateDocument")).toBe(
      "Retraduzir pagina"
    );
    expect(i18n.getResource("pt", "translation", "library.translationStatusCached")).toBe(
      "Traducao carregada do cache local."
    );
    expect(i18n.getResource("pt", "translation", "library.nextReaderPage")).toBe(
      "Proxima pagina"
    );
    expect(i18n.getResource("pt", "translation", "library.showOriginalPane")).toBe(
      "Mostrar idioma original"
    );
    expect(i18n.getResource("pt", "translation", "library.hideOriginalPane")).toBe(
      "Ocultar idioma original"
    );
    expect(i18n.getResource("pt", "translation", "library.pdfReaderTitle")).toBe(
      "PDF original"
    );
    expect(i18n.getResource("en", "translation", "library.nextPdfPageLabel")).toBe(
      "Next PDF page"
    );
    expect(i18n.getResource("pt", "translation", "library.previousPdfPage")).toBe("<");
    expect(i18n.getResource("pt", "translation", "library.nextPdfPage")).toBe(">");
    expect(
      i18n.getResource("pt", "translation", "library.pdfReaderPreferenceSaveError")
    ).toBe("Nao foi possivel salvar a posicao do leitor PDF.");
    expect(i18n.getResource("pt", "translation", "library.extractedTextTitle")).toBe(
      "Texto extraido"
    );
    expect(i18n.getResource("en", "translation", "library.expandPreview")).toBe(
      "Show extracted text"
    );
    expect(i18n.getResource("es", "translation", "library.collapsePreview")).toBe(
      "Ocultar texto extraido"
    );
    expect(i18n.getResource("en", "translation", "library.readerPageStatus")).toBe(
      "Page {{currentPage}} of {{totalPages}}"
    );
    expect(i18n.getResource("pt", "translation", "library.translatedReaderPages")).toBe(
      "Paginas traduzidas: {{pages}}"
    );
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
    expect(i18n.getResource("pt", "translation", "study.previousCard")).toBe("Card anterior");
    expect(i18n.getResource("en", "translation", "study.previousCard")).toBe("Previous card");
    expect(i18n.getResource("es", "translation", "study.previousCard")).toBe("Card anterior");
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
    expect(i18n.getResource("pt", "translation", "study.exportSessionPdfReport")).toBe(
      "Exportar PDF"
    );
    expect(i18n.getResource("pt", "translation", "study.previewSessionPdfReport")).toBe(
      "Previa PDF"
    );
    expect(i18n.getResource("pt", "translation", "study.exportAnki")).toBe("Exportar Anki");
    expect(i18n.getResource("pt", "translation", "study.exportAnkiPackage")).toBe(
      "Exportar Anki .apkg"
    );
    expect(i18n.getResource("pt", "translation", "study.exportAnkiTsv")).toBe(
      "Exportar Anki TSV"
    );
    expect(i18n.getResource("pt", "translation", "study.exportFileError")).toBe(
      "Nao foi possivel exportar o arquivo."
    );
    expect(i18n.getResource("pt", "translation", "study.meditationTitle")).toBe("Anotacao");
    expect(i18n.getResource("pt", "translation", "study.addMeditation")).toBe(
      "Adicionar anotacao"
    );
    expect(i18n.getResource("pt", "translation", "study.meditationEntryLabel")).toBe(
      "Anotacao {{number}}"
    );
    expect(i18n.getResource("pt", "translation", "study.meditationListSummary")).toBe(
      "{{count}} registro(s)"
    );
    expect(i18n.getResource("pt", "translation", "study.openMeditationPanel")).toBe(
      "Abrir anotacao"
    );
    expect(i18n.getResource("pt", "translation", "study.editMeditation")).toBe(
      "Editar anotacao"
    );
    expect(i18n.getResource("pt", "translation", "study.deleteMeditation")).toBe(
      "Excluir anotacao"
    );
    expect(i18n.getResource("pt", "translation", "study.meditationAdded")).toBe(
      "Anotacao adicionada."
    );
    expect(i18n.getResource("pt", "translation", "study.meditationUpdated")).toBe(
      "Anotacao atualizada."
    );
    expect(i18n.getResource("pt", "translation", "study.meditationDeleted")).toBe(
      "Anotacao excluida."
    );
    expect(i18n.getResource("en", "translation", "study.meditationTitle")).toBe("Note");
    expect(i18n.getResource("es", "translation", "study.meditationTitle")).toBe("Anotacion");
    expect(i18n.getResource("pt", "translation", "study.deleteCards")).toBe("Excluir cards");
    expect(i18n.getResource("pt", "translation", "progress.title")).toBe(
      "Progresso por documento"
    );
    expect(i18n.getResource("pt", "translation", "study.retentionTitle")).toBe("Retencao");
    expect(i18n.getResource("pt", "translation", "study.metricPeriodTitle")).toBe(
      "Resumo do periodo"
    );
    expect(i18n.getResource("pt", "translation", "study.goalTitle")).toBe(
      "Meta do documento"
    );
    expect(i18n.getResource("pt", "translation", "study.goalRecurrenceLabel")).toBe(
      "Periodo da meta"
    );
    expect(i18n.getResource("pt", "translation", "study.goalAlertWeekly_other")).toBe(
      "Faltam {{count}} revisoes para cumprir a meta de 7 dias."
    );
    expect(i18n.getResource("pt", "translation", "study.goalNotificationTitle")).toBe(
      "Meta de estudo pendente"
    );
    expect(i18n.getResource("pt", "translation", "study.goalNotificationToggle")).toBe(
      "Ativar lembretes de meta"
    );
    expect(i18n.getResource("pt", "translation", "study.goalNotificationTimeLabel")).toBe(
      "Horario do lembrete"
    );
    expect(i18n.getResource("pt", "translation", "study.categoryTitle")).toBe(
      "Classificacao de estudo"
    );
    expect(i18n.getResource("pt", "translation", "study.saveCategoryMetadata")).toBe(
      "Salvar classificacao"
    );
    expect(i18n.getResource("pt", "translation", "study.sessionTrendTitle")).toBe(
      "Tendencia por sessao"
    );
    expect(i18n.getResource("pt", "translation", "study.hardCardTrendTitle")).toBe(
      "Cards dificeis por periodo"
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
    expect(i18n.getResource("pt", "translation", "library.searchAction")).toBe("Pesquisar");
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
    expect(i18n.getResource("pt", "translation", "library.cardGenerationQueueProgress")).toBe(
      "Fila: {{completed}} concluidos, {{failed}} falharam, {{pending}} pendentes."
    );
    expect(i18n.getResource("pt", "translation", "library.cardGenerationQueueTitle")).toBe(
      "Fila de geracao de cards"
    );
    expect(i18n.getResource("pt", "translation", "library.cardGenerationQueueCompleted")).toBe(
      "Concluidos"
    );
    expect(i18n.getResource("pt", "translation", "library.cardGenerationBackgroundTitle")).toBe(
      "Geracao de cards em segundo plano"
    );
    expect(i18n.getResource("en", "translation", "library.generatingCardsWithOllama")).toBe(
      "Generating cards with Ollama."
    );
    expect(i18n.getResource("en", "translation", "library.cardGenerationQueueProgress")).toBe(
      "Queue: {{completed}} completed, {{failed}} failed, {{pending}} pending."
    );
    expect(i18n.getResource("en", "translation", "library.cardGenerationBackgroundTitle")).toBe(
      "Background card generation"
    );
    expect(i18n.getResource("es", "translation", "library.generatingCardsWithOllama")).toBe(
      "Generando cards con Ollama."
    );
    expect(i18n.getResource("es", "translation", "library.cardGenerationQueueProgress")).toBe(
      "Cola: {{completed}} concluidos, {{failed}} fallaron, {{pending}} pendientes."
    );
    expect(i18n.getResource("es", "translation", "library.cardGenerationQueuePending")).toBe(
      "Pendientes"
    );
    expect(i18n.getResource("es", "translation", "library.cardGenerationBackgroundTitle")).toBe(
      "Generacion de cards en segundo plano"
    );
    expect(i18n.getResource("pt", "translation", "library.operationOverlayTitle")).toBe(
      "Processando arquivo"
    );
    expect(i18n.getResource("pt", "translation", "library.cancelProcessing")).toBe(
      "Cancelar processamento"
    );
  });

  it("has mock fallback labels in every supported language", () => {
    expect(i18n.getResource("pt", "translation", "library.mockGenerationFallback")).toBe(
      "Ollama falhou. Cards mockados foram gerados apenas para desenvolvimento."
    );
    expect(i18n.getResource("pt", "translation", "library.cardGenerationSkippedChunks")).toBe(
      "Alguns chunks falharam no Ollama. Foram ignorados {{count}} de {{total}} chunks; use Gerar mais cards para tentar novamente."
    );
    expect(i18n.getResource("en", "translation", "library.mockGenerationFallback")).toBe(
      "Ollama failed. Mock cards were generated for development only."
    );
    expect(i18n.getResource("es", "translation", "library.mockGenerationFallback")).toBe(
      "Ollama fallo. Se generaron cards mockados solo para desarrollo."
    );
  });
});
