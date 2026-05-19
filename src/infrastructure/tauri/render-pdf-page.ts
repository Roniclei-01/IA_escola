import { invoke } from "@tauri-apps/api/core";

export interface RenderPdfPageRequest {
  file_path: string;
  page: number;
  dpi?: number;
}

export interface RenderPdfPageResponse {
  page: number;
  page_count: number;
  image_data_url: string;
}

export async function renderPdfPage(
  request: RenderPdfPageRequest
): Promise<RenderPdfPageResponse> {
  return invoke<RenderPdfPageResponse>("render_pdf_page", { request });
}
