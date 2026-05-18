import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const resources = {
  pt: {
    translation: {
      app: {
        stage: "MVP 0.1",
        title: "Estudo IA Local",
        summary: "Base inicial do aplicativo local-first para importar materiais, gerar flashcards e estudar com IA local."
      }
    }
  },
  en: {
    translation: {
      app: {
        stage: "MVP 0.1",
        title: "Local AI Study",
        summary: "Initial local-first app foundation to import materials, generate flashcards and study with local AI."
      }
    }
  },
  es: {
    translation: {
      app: {
        stage: "MVP 0.1",
        title: "Estudio IA Local",
        summary: "Base inicial de la aplicacion local-first para importar materiales, generar tarjetas y estudiar con IA local."
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
