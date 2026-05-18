import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listStudyReviews, saveStudyReview } from "./study-reviews";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("study review Tauri bridge", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("saves a study review", async () => {
    invokeMock.mockResolvedValue({
      review: {
        id: "review-1",
        card_id: "card-1",
        rating: "easy",
        priority: 20,
        next_review_at: 1700604800
      }
    });

    const review = await saveStudyReview("card-1", "easy");

    expect(invokeMock).toHaveBeenCalledWith("save_study_review", {
      request: {
        card_id: "card-1",
        rating: "easy"
      }
    });
    expect(review.rating).toBe("easy");
  });

  it("lists study reviews", async () => {
    invokeMock.mockResolvedValue({
      reviews: [
        {
        id: "review-1",
        card_id: "card-1",
        rating: "hard",
        priority: 70,
        next_review_at: 1700086400
        }
      ]
    });

    const reviews = await listStudyReviews("document-1");

    expect(invokeMock).toHaveBeenCalledWith("list_study_reviews", {
      documentId: "document-1"
    });
    expect(reviews).toHaveLength(1);
    expect(reviews[0].rating).toBe("hard");
  });
});
