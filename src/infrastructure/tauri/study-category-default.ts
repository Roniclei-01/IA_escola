import { invoke } from "@tauri-apps/api/core";

export interface StudyCategoryDefault {
  category: string;
  subcategory: string;
}

export async function loadStudyCategoryDefault() {
  return invoke<StudyCategoryDefault>("load_study_category_default");
}

export async function saveStudyCategoryDefault(request: StudyCategoryDefault) {
  return invoke<StudyCategoryDefault>("save_study_category_default", {
    request: {
      category: request.category,
      subcategory: request.subcategory
    }
  });
}
