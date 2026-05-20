import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveStudyCategory,
  deleteStudyCategory,
  listStudyCategories,
  restoreStudyCategory,
  saveStudyCategory
} from "./study-categories";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("study categories bridge", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("lists study categories from Tauri", async () => {
    invokeMock.mockResolvedValue({
      categories: [
        {
          id: "category-1",
          name: "Tecnologia",
          subcategories: ["Redes"],
          archived: false
        }
      ]
    });

    const response = await listStudyCategories({ includeArchived: true });

    expect(invokeMock).toHaveBeenCalledWith("list_study_categories", {
      includeArchived: true
    });
    expect(response.categories[0].name).toBe("Tecnologia");
  });

  it("saves a study category through Tauri", async () => {
    invokeMock.mockResolvedValue({
      id: "category-1",
      name: "Tecnologia",
      subcategories: ["Redes", "Seguranca"],
      archived: false
    });

    const category = await saveStudyCategory({
      id: "category-1",
      name: "Tecnologia",
      subcategories: ["Redes", "Seguranca"]
    });

    expect(invokeMock).toHaveBeenCalledWith("save_study_category", {
      request: {
        id: "category-1",
        name: "Tecnologia",
        subcategories: ["Redes", "Seguranca"]
      }
    });
    expect(category.subcategories).toEqual(["Redes", "Seguranca"]);
  });

  it("archives, restores and deletes categories through Tauri", async () => {
    invokeMock.mockResolvedValue({
      id: "category-1",
      name: "Tecnologia",
      subcategories: ["Redes"],
      archived: true
    });

    await archiveStudyCategory("category-1");
    await restoreStudyCategory("category-1");
    await deleteStudyCategory("category-1");

    expect(invokeMock).toHaveBeenNthCalledWith(1, "archive_study_category", {
      request: { id: "category-1" }
    });
    expect(invokeMock).toHaveBeenNthCalledWith(2, "restore_study_category", {
      request: { id: "category-1" }
    });
    expect(invokeMock).toHaveBeenNthCalledWith(3, "delete_study_category", {
      request: { id: "category-1" }
    });
  });
});
