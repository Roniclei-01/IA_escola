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
});
