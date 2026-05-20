import { invoke } from "@tauri-apps/api/core";

export interface StudyCategory {
  id: string;
  name: string;
  subcategories: string[];
  archived: boolean;
}

export interface ListStudyCategoriesResponse {
  categories: StudyCategory[];
}

export interface SaveStudyCategoryRequest {
  id?: string | null;
  name: string;
  subcategories: string[];
}

export async function listStudyCategories(options: { includeArchived?: boolean } = {}) {
  return invoke<ListStudyCategoriesResponse>("list_study_categories", {
    includeArchived: options.includeArchived ?? false
  });
}

export async function saveStudyCategory(request: SaveStudyCategoryRequest) {
  return invoke<StudyCategory>("save_study_category", {
    request: {
      id: request.id ?? null,
      name: request.name,
      subcategories: request.subcategories
    }
  });
}

export async function archiveStudyCategory(id: string) {
  return invoke<StudyCategory>("archive_study_category", {
    request: { id }
  });
}

export async function restoreStudyCategory(id: string) {
  return invoke<StudyCategory>("restore_study_category", {
    request: { id }
  });
}

export async function deleteStudyCategory(id: string) {
  return invoke<StudyCategory>("delete_study_category", {
    request: { id }
  });
}
