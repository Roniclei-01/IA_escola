import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadStudyGoal, saveStudyGoal } from "./study-goals";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("study goals", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("loads a document review goal from Tauri", async () => {
    invokeMock.mockResolvedValue({
      document_id: "document-1",
      target_reviews: 12
    });

    const goal = await loadStudyGoal("document-1");

    expect(invokeMock).toHaveBeenCalledWith("load_study_goal", {
      documentId: "document-1"
    });
    expect(goal).toEqual({
      document_id: "document-1",
      target_reviews: 12
    });
  });

  it("saves a document review goal through Tauri", async () => {
    invokeMock.mockResolvedValue({
      document_id: "document-1",
      target_reviews: 8
    });

    const goal = await saveStudyGoal("document-1", 8);

    expect(invokeMock).toHaveBeenCalledWith("save_study_goal", {
      request: {
        document_id: "document-1",
        target_reviews: 8
      }
    });
    expect(goal.target_reviews).toBe(8);
  });
});
