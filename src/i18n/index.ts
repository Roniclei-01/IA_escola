import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const resources = {
  pt: {
    translation: {
      app: {
        stage: "MVP 0.1",
        title: "Estudo IA Local",
        summary: "Base inicial do aplicativo local-first para importar materiais, gerar flashcards e estudar com IA local."
      },
      library: {
        status: "Importacao TXT/PDF",
        filePathLabel: "Caminho do arquivo .txt ou .pdf",
        filePathPlaceholder: "/home/usuario/livro.txt",
        import: "Importar",
        importing: "Importando",
        importingDocument: "Importando documento.",
        chunkingDocument: "Dividindo conteudo em chunks.",
        generatingCardsWithOllama: "Gerando cards com Ollama.",
        savingStudyCards: "Salvando cards de estudo.",
        loadingSavedCards: "Carregando cards salvos.",
        mockGenerationFallback:
          "Ollama falhou. Cards mockados foram gerados apenas para desenvolvimento.",
        emptyPath: "Informe o caminho do arquivo .txt ou .pdf.",
        unknownError: "Nao foi possivel importar o arquivo.",
        savedDocuments: "Documentos salvos",
        loadingSavedDocuments: "Carregando documentos salvos",
        noSavedDocuments: "Nenhum documento salvo ainda.",
        savedDocumentsError: "Nao foi possivel carregar documentos salvos.",
        savedDocumentItem: "Documento {{number}}",
        importedDocument: "Documento importado",
        documentTitle: "Previa do conteudo",
        chunkCount_one: "{{count}} chunk gerado",
        chunkCount_other: "{{count}} chunks gerados",
        cardCount_one: "{{count}} card gerado",
        cardCount_other: "{{count}} cards gerados",
        emptyState: "Nenhum documento importado nesta sessao.",
        emptyStateLabel: "Estado vazio da biblioteca"
      },
      study: {
        title: "Estudo",
        progress: "Card {{current}} de {{total}}",
        reviewSummary: "Acertos: {{easy}} | Erros: {{again}} | Dificeis: {{hard}}",
        revealAnswer: "Revelar resposta",
        nextCard: "Proximo card",
        again: "Errei",
        hard: "Dificil",
        easy: "Acertei"
      },
      settings: {
        ollamaTitle: "Ollama",
        ollamaBaseUrlLabel: "URL local do Ollama",
        ollamaModelLabel: "Modelo",
        testOllama: "Testar",
        testingOllama: "Testando",
        ollamaConnectionOk: "Ollama conectado com o modelo {{model}}.",
        ollamaConnectionError: "Nao foi possivel testar o Ollama.",
        ollamaSettingsLoadError: "Nao foi possivel carregar as configuracoes do Ollama."
      }
    }
  },
  en: {
    translation: {
      app: {
        stage: "MVP 0.1",
        title: "Local AI Study",
        summary: "Initial local-first app foundation to import materials, generate flashcards and study with local AI."
      },
      library: {
        status: "TXT/PDF import",
        filePathLabel: "Study file path",
        filePathPlaceholder: "/home/user/book.txt",
        import: "Import",
        importing: "Importing",
        importingDocument: "Importing document.",
        chunkingDocument: "Splitting content into chunks.",
        generatingCardsWithOllama: "Generating cards with Ollama.",
        savingStudyCards: "Saving study cards.",
        loadingSavedCards: "Loading saved cards.",
        mockGenerationFallback:
          "Ollama failed. Mock cards were generated for development only.",
        emptyPath: "Enter a .txt or .pdf file path.",
        unknownError: "Could not import the file.",
        savedDocuments: "Saved documents",
        loadingSavedDocuments: "Loading saved documents",
        noSavedDocuments: "No saved documents yet.",
        savedDocumentsError: "Could not load saved documents.",
        savedDocumentItem: "Document {{number}}",
        importedDocument: "Imported document",
        documentTitle: "Content preview",
        chunkCount_one: "{{count}} chunk generated",
        chunkCount_other: "{{count}} chunks generated",
        cardCount_one: "{{count}} card generated",
        cardCount_other: "{{count}} cards generated",
        emptyState: "No document imported in this session.",
        emptyStateLabel: "Empty library state"
      },
      study: {
        title: "Study",
        progress: "Card {{current}} of {{total}}",
        reviewSummary: "Correct: {{easy}} | Missed: {{again}} | Hard: {{hard}}",
        revealAnswer: "Reveal answer",
        nextCard: "Next card",
        again: "Missed",
        hard: "Hard",
        easy: "Correct"
      },
      settings: {
        ollamaTitle: "Ollama",
        ollamaBaseUrlLabel: "Local Ollama URL",
        ollamaModelLabel: "Model",
        testOllama: "Test",
        testingOllama: "Testing",
        ollamaConnectionOk: "Ollama connected with model {{model}}.",
        ollamaConnectionError: "Could not test Ollama.",
        ollamaSettingsLoadError: "Could not load Ollama settings."
      }
    }
  },
  es: {
    translation: {
      app: {
        stage: "MVP 0.1",
        title: "Estudio IA Local",
        summary: "Base inicial de la aplicacion local-first para importar materiales, generar tarjetas y estudiar con IA local."
      },
      library: {
        status: "Importacion TXT/PDF",
        filePathLabel: "Ruta del archivo .txt o .pdf",
        filePathPlaceholder: "/home/usuario/libro.txt",
        import: "Importar",
        importing: "Importando",
        importingDocument: "Importando documento.",
        chunkingDocument: "Dividiendo contenido en chunks.",
        generatingCardsWithOllama: "Generando cards con Ollama.",
        savingStudyCards: "Guardando cards de estudio.",
        loadingSavedCards: "Cargando cards guardados.",
        mockGenerationFallback:
          "Ollama fallo. Se generaron cards mockados solo para desarrollo.",
        emptyPath: "Informe la ruta del archivo .txt o .pdf.",
        unknownError: "No fue posible importar el archivo.",
        savedDocuments: "Documentos guardados",
        loadingSavedDocuments: "Cargando documentos guardados",
        noSavedDocuments: "Aun no hay documentos guardados.",
        savedDocumentsError: "No fue posible cargar documentos guardados.",
        savedDocumentItem: "Documento {{number}}",
        importedDocument: "Documento importado",
        documentTitle: "Vista previa del contenido",
        chunkCount_one: "{{count}} chunk generado",
        chunkCount_other: "{{count}} chunks generados",
        cardCount_one: "{{count}} card generado",
        cardCount_other: "{{count}} cards generados",
        emptyState: "Ningun documento importado en esta sesion.",
        emptyStateLabel: "Estado vacio de la biblioteca"
      },
      study: {
        title: "Estudio",
        progress: "Card {{current}} de {{total}}",
        reviewSummary: "Aciertos: {{easy}} | Errores: {{again}} | Dificiles: {{hard}}",
        revealAnswer: "Revelar respuesta",
        nextCard: "Siguiente card",
        again: "Falle",
        hard: "Dificil",
        easy: "Acerto"
      },
      settings: {
        ollamaTitle: "Ollama",
        ollamaBaseUrlLabel: "URL local de Ollama",
        ollamaModelLabel: "Modelo",
        testOllama: "Probar",
        testingOllama: "Probando",
        ollamaConnectionOk: "Ollama conectado con el modelo {{model}}.",
        ollamaConnectionError: "No fue posible probar Ollama.",
        ollamaSettingsLoadError: "No fue posible cargar la configuracion de Ollama."
      }
    }
  }
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: "pt",
  fallbackLng: "pt",
  interpolation: {
    escapeValue: false
  }
});

export default i18n;
