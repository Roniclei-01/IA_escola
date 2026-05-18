import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

export interface ExportTextFileResponse {
  file_path: string;
}

function exportFilterFor(fileName: string): { name: string; extensions: string[] } {
  if (fileName.endsWith(".tsv")) {
    return { name: "Anki TSV", extensions: ["tsv"] };
  }

  if (fileName.endsWith(".md")) {
    return { name: "Markdown", extensions: ["md"] };
  }

  if (fileName.endsWith(".html")) {
    return { name: "HTML", extensions: ["html"] };
  }

  return { name: "Text", extensions: ["txt"] };
}

export async function exportTextFile(
  fileName: string,
  content: string
): Promise<ExportTextFileResponse | null> {
  const filePath = await save({
    title: "Exportar arquivo",
    defaultPath: fileName,
    filters: [exportFilterFor(fileName)]
  });

  if (!filePath) {
    return null;
  }

  return invoke<ExportTextFileResponse>("export_text_file", {
    filePath,
    content
  });
}
