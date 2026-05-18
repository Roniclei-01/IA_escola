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
});
