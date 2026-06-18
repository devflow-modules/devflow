import { describe, expect, it, vi } from "vitest";
import {
  CAREER_FEEDBACK_COMMENT_MAX_LENGTH,
  createDiscardFeedbackRepository,
  handleCareerFeedback,
  parseCareerFeedback,
} from "./feedback";

describe("career feedback", () => {
  it("accepts a valid payload and discards without consent", async () => {
    const result = await handleCareerFeedback({
      rating: "helpful",
      category: "resume",
      consentToStore: false,
    });
    expect(result.status).toBe("discarded");
    expect(result.stored).toBe(false);
    expect(result.persisted).toBe(false);
    expect(result.consentRespected).toBe(true);
    expect(result.reviewRequired).toBe(true);
    expect(result.correlationId.startsWith("career_")).toBe(true);
  });

  it("hands a consented payload to the repository (discard stores nothing)", async () => {
    const result = await handleCareerFeedback({
      rating: "partially_helpful",
      category: "ats",
      consentToStore: true,
    });
    expect(result.status).toBe("accepted");
    expect(result.stored).toBe(false);
    expect(result.persisted).toBe(false);
  });

  it("rejects an oversized comment", () => {
    const parsed = parseCareerFeedback({
      rating: "not_helpful",
      category: "system",
      comment: "x".repeat(CAREER_FEEDBACK_COMMENT_MAX_LENGTH + 1),
      consentToStore: false,
    });
    expect(parsed.ok).toBe(false);
  });

  it("rejects unsafe/unknown keys (strict schema)", () => {
    const parsed = parseCareerFeedback({
      rating: "helpful",
      category: "resume",
      consentToStore: false,
      apiKey: "sk-should-not-be-here",
      resume: "full resume text",
    });
    expect(parsed.ok).toBe(false);
  });

  it("returns rejected for invalid body", async () => {
    const result = await handleCareerFeedback({ rating: "invalid" });
    expect(result.status).toBe("rejected");
    expect(result.errorCode).toBe("invalid_request");
    expect(result.persisted).toBe(false);
  });

  it("only persists via repository when it actually stores", async () => {
    const repo = createDiscardFeedbackRepository();
    const spy = vi.spyOn(repo, "store").mockResolvedValue({ stored: true });
    const result = await handleCareerFeedback(
      { rating: "helpful", category: "interview", consentToStore: true },
      repo,
    );
    expect(spy).toHaveBeenCalledOnce();
    expect(result.stored).toBe(true);
    expect(result.persisted).toBe(true);
  });
});
