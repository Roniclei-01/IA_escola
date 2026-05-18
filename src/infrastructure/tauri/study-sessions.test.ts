import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listStudySessionSummaries, startStudySession } from "./study-sessions";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("study session Tauri bridge", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("starts a study session", async () => {
    invokeMock.mockResolvedValue({
      session: {
        id: "session-1",
        document_id: "document-1",
        started_at: 1700000000
      }
    });

    const session = await startStudySession("document-1");

    expect(invokeMock).toHaveBeenCalledWith("start_study_session", {
      request: {
        document_id: "document-1"
      }
    });
    expect(session.id).toBe("session-1");
  });

  it("lists study session summaries", async () => {
    invokeMock.mockResolvedValue({
      summaries: [
        {
          session_id: "session-1",
          document_id: "document-1",
          started_at: 1700000000,
          again_count: 1,
          hard_count: 2,
          easy_count: 3
        }
      ]
    });

    const summaries = await listStudySessionSummaries("document-1");

    expect(invokeMock).toHaveBeenCalledWith("list_study_session_summaries", {
      documentId: "document-1"
    });
    expect(summaries[0].easy_count).toBe(3);
  });
});
