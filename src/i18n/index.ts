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
        status: "Importacao TXT",
        filePathLabel: "Caminho do arquivo .txt",
        filePathPlaceholder: "/home/usuario/livro.txt",
        import: "Importar",
        importing: "Importando",
        emptyPath: "Informe o caminho do arquivo .txt.",
        unknownError: "Nao foi possivel importar o arquivo.",
        importedDocument: "Documento importado",
        documentTitle: "Previa do conteudo",
        emptyState: "Nenhum documento importado nesta sessao.",
        emptyStateLabel: "Estado vazio da biblioteca"
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
        status: "TXT import",
        filePathLabel: "Text file path",
        filePathPlaceholder: "/home/user/book.txt",
        import: "Import",
        importing: "Importing",
        emptyPath: "Enter a .txt file path.",
        unknownError: "Could not import the file.",
        importedDocument: "Imported document",
        documentTitle: "Content preview",
        emptyState: "No document imported in this session.",
        emptyStateLabel: "Empty library state"
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
        status: "Importacion TXT",
        filePathLabel: "Ruta del archivo .txt",
        filePathPlaceholder: "/home/usuario/libro.txt",
        import: "Importar",
        importing: "Importando",
        emptyPath: "Informe la ruta del archivo .txt.",
        unknownError: "No fue posible importar el archivo.",
        importedDocument: "Documento importado",
        documentTitle: "Vista previa del contenido",
        emptyState: "Ningun documento importado en esta sesion.",
        emptyStateLabel: "Estado vacio de la biblioteca"
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
