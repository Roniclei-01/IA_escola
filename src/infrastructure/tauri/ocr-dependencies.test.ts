import { describe, expect, it, vi } from "vitest";
import { testOcrDependencies } from "./ocr-dependencies";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock
}));

describe("OCR dependency Tauri bridge", () => {
  it("tests local OCR dependencies", async () => {
    invokeMock.mockResolvedValueOnce({
      pdftoppm_available: true,
      tesseract_available: false
    });

    const response = await testOcrDependencies();

    expect(invokeMock).toHaveBeenCalledWith("test_ocr_dependencies");
    expect(response.pdftoppm_available).toBe(true);
    expect(response.tesseract_available).toBe(false);
  });
});
