import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import type { StudyCard } from "../../domain/model-adapter";

export interface ExportAnkiPackageResponse {
  file_path: string;
  card_count: number;
}

function toExportCard(card: StudyCard) {
  return {
    id: card.id,
    front: card.front,
    back: card.back,
    tags: card.tags,
    ...(card.cardType ? { card_type: card.cardType } : {}),
    ...(card.choices ? { choices: card.choices } : {}),
    ...(card.correctChoiceIndex !== undefined
      ? { correct_choice_index: card.correctChoiceIndex }
      : {}),
    ...(card.explanation !== undefined ? { explanation: card.explanation } : {})
  };
}

export async function exportAnkiPackage(
  fileName: string,
  deckName: string,
  cards: StudyCard[]
): Promise<ExportAnkiPackageResponse | null> {
  const filePath = await save({
    title: "Exportar Anki",
    defaultPath: fileName,
    filters: [{ name: "Anki APKG", extensions: ["apkg"] }]
  });

  if (!filePath) {
    return null;
  }

  return invoke<ExportAnkiPackageResponse>("export_anki_package", {
    filePath,
    deckName,
    cards: cards.map(toExportCard)
  });
}
