import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadStudyCategoryDefault, saveStudyCategoryDefault } from "./study-category-default";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("study category default bridge", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("loads the default category from Tauri", async () => {
    invokeMock.mockResolvedValue({
      category: "Tecnologia e Computacao",
      subcategory: "Redes de computadores"
    });

    const settings = await loadStudyCategoryDefault();

    expect(invokeMock).toHaveBeenCalledWith("load_study_category_default");
    expect(settings).toEqual({
      category: "Tecnologia e Computacao",
      subcategory: "Redes de computadores"
    });
  });

  it("saves the default category through Tauri", async () => {
    invokeMock.mockResolvedValue({
      category: "Ciberseguranca",
      subcategory: "Pentest"
    });

    const settings = await saveStudyCategoryDefault({
      category: "Ciberseguranca",
      subcategory: "Pentest"
    });

    expect(invokeMock).toHaveBeenCalledWith("save_study_category_default", {
      request: {
        category: "Ciberseguranca",
        subcategory: "Pentest"
      }
    });
    expect(settings.subcategory).toBe("Pentest");
  });
});
