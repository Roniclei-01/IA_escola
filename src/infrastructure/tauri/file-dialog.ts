import { open } from "@tauri-apps/plugin-dialog";

export async function selectStudyFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [
      {
        name: "Study files",
        extensions: ["txt", "pdf"]
      }
    ]
  });

  return selected;
}
