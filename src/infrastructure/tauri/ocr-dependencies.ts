import { invoke } from "@tauri-apps/api/core";

export interface OcrDependencies {
  pdftoppm_available: boolean;
  tesseract_available: boolean;
}

export async function testOcrDependencies(): Promise<OcrDependencies> {
  return invoke<OcrDependencies>("test_ocr_dependencies");
}
