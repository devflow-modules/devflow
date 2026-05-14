import { describe, expect, it, vi } from "vitest";
import {
  ANSWER_REVIEW_MAX_ANSWER_CHARS,
  ANSWER_REVIEW_MAX_CONTEXT_CHARS,
  buildAnswerReviewExportFilename,
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
  extractJsonObject,
  formatAnswerReviewAsMarkdown,
  getAnswerReviewContextCharCount,
  parseReviewJsonResponse,
  reviewAnswerWithLimits,
  runMockAnswerReview,
  sanitizeAnswerReviewFilenameSlug,
  validateAnswerReviewRequest,
} from "./ai-answer-review";
import {
  createMockAiAnswerReviewProvider,
  createOpenAiAnswerReviewProvider,
  resolveAnswerReviewProvider,
} from "./ai-provider";

describe("getAnswerReviewContextCharCount", () => {
  it("sums trimmed optional fields", () => {
    expect(
      getAnswerReviewContextCharCount({
        role: "  a  ",
        company: "b",
        interviewType: undefined,
        language: "english",
      }),
    ).toBe(1 + 1 + 7);
  });
});

describe("validateAnswerReviewRequest", () => {
  it("rejects empty answer", () => {
    const r = validateAnswerReviewRequest({ userAnswer: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Write an answer");
  });

  it("accepts answer at max length", () => {
    const body = "x".repeat(ANSWER_REVIEW_MAX_ANSWER_CHARS);
    const r = validateAnswerReviewRequest({ userAnswer: body });
    expect(r.ok).toBe(true);
  });

  it("rejects answer above max", () => {
    const body = "x".repeat(ANSWER_REVIEW_MAX_ANSWER_CHARS + 1);
    const r = validateAnswerReviewRequest({ userAnswer: body });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("too long");
  });

  it("rejects context above max", () => {
    const pad = "y".repeat(ANSWER_REVIEW_MAX_CONTEXT_CHARS + 1);
    const r = validateAnswerReviewRequest({
      userAnswer: "ok",
      role: pad,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("context");
  });

  it("accepts context at max combined length", () => {
    const half = Math.floor(ANSWER_REVIEW_MAX_CONTEXT_CHARS / 2);
    const r = validateAnswerReviewRequest({
      userAnswer: "ok",
      role: "y".repeat(half),
      company: "z".repeat(ANSWER_REVIEW_MAX_CONTEXT_CHARS - half),
    });
    expect(r.ok).toBe(true);
  });
});

describe("reviewAnswerWithLimits", () => {
  it("does not call provider when answer exceeds limit", async () => {
    const review = vi.fn();
    await expect(
      reviewAnswerWithLimits({ userAnswer: "x".repeat(ANSWER_REVIEW_MAX_ANSWER_CHARS + 1) }, { review }),
    ).rejects.toThrow(/too long/);
    expect(review).not.toHaveBeenCalled();
  });

  it("does not call provider when context exceeds limit", async () => {
    const review = vi.fn();
    await expect(
      reviewAnswerWithLimits(
        { userAnswer: "hello", role: "z".repeat(ANSWER_REVIEW_MAX_CONTEXT_CHARS + 1) },
        { review },
      ),
    ).rejects.toThrow(/context/);
    expect(review).not.toHaveBeenCalled();
  });

  it("calls provider when valid", async () => {
    const review = vi.fn().mockResolvedValue({
      score: 5,
      strengths: [],
      improvements: ["a", "b"],
      improvedVersion: "x",
      englishNotes: "y",
      followUpPrompt: "z",
    });
    const out = await reviewAnswerWithLimits({ userAnswer: "hello world" }, { review });
    expect(review).toHaveBeenCalledTimes(1);
    expect(out.score).toBe(5);
  });
});

describe("buildReviewUserPrompt", () => {
  it("includes the verbatim answer and optional context", () => {
    const p = buildReviewUserPrompt({
      userAnswer: "  I led the migration.  ",
      role: "Staff Engineer",
      company: "Acme",
      interviewType: "behavioral",
      language: "english",
    });
    expect(p).toContain("I led the migration.");
    expect(p).toContain("Role: Staff Engineer");
    expect(p).toContain("Company context: Acme");
    expect(p).toContain("Interview type: behavioral");
    expect(p).toContain("Preferred answer language: english");
  });
});

describe("buildReviewSystemPrompt", () => {
  it("mentions JSON-only output expectations", () => {
    const s = buildReviewSystemPrompt();
    expect(s.toLowerCase()).toContain("json");
    expect(s).toContain("score");
  });
});

describe("extractJsonObject", () => {
  it("strips markdown fences", () => {
    expect(extractJsonObject('```json\n{"score":1}\n```')).toBe('{"score":1}');
  });
});

describe("parseReviewJsonResponse", () => {
  it("parses valid JSON", () => {
    const raw = JSON.stringify({
      score: 7.5,
      strengths: ["a"],
      improvements: ["b", "c"],
      improvedVersion: "x",
      englishNotes: "y",
      followUpPrompt: "z",
    });
    const r = parseReviewJsonResponse(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.score).toBe(7.5);
      expect(r.data.strengths).toEqual(["a"]);
    }
  });

  it("rejects out-of-range score", () => {
    const r = parseReviewJsonResponse(
      JSON.stringify({
        score: 11,
        strengths: [],
        improvements: [],
        improvedVersion: "",
        englishNotes: "",
        followUpPrompt: "",
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("returns error on invalid JSON", () => {
    const r = parseReviewJsonResponse("not json");
    expect(r.ok).toBe(false);
  });
});

describe("runMockAnswerReview", () => {
  it("returns a valid structured result without network", () => {
    const out = runMockAnswerReview({
      userAnswer: "I improved latency because we measured p99 and shipped a cache.",
      role: "Backend",
      interviewType: "behavioral",
    });
    expect(out.score).toBeGreaterThanOrEqual(0);
    expect(out.score).toBeLessThanOrEqual(10);
    expect(out.strengths.length).toBeGreaterThan(0);
    expect(out.improvements.length).toBeGreaterThanOrEqual(2);
    expect(out.improvedVersion.length).toBeGreaterThan(10);
    expect(out.followUpPrompt.length).toBeGreaterThan(5);
  });
});

describe("formatAnswerReviewAsMarkdown", () => {
  const sampleResult = {
    score: 7,
    strengths: ["A", "B"],
    improvements: ["C", "D"],
    improvedVersion: "Better.",
    englishNotes: "Note.",
    followUpPrompt: "Drill X.",
  };

  it("includes metadata, score, and fenced original answer", () => {
    const md = formatAnswerReviewAsMarkdown({
      request: { userAnswer: "  Hello  ", role: "Eng", company: "Co" },
      result: sampleResult,
      exportedAt: "2026-05-14T12:00:00.000Z",
    });
    expect(md).toContain("# AI Answer Review");
    expect(md).toContain("2026-05-14T12:00:00.000Z");
    expect(md).toContain("**Role:** Eng");
    expect(md).toContain("**Company:** Co");
    expect(md).toContain("Hello");
    expect(md).toContain("7/10");
    expect(md).toContain("- A");
    expect(md).toContain("## Improved version");
    expect(md).toContain("Better.");
  });

  it("uses a longer fence when the answer contains triple backticks", () => {
    const md = formatAnswerReviewAsMarkdown({
      request: { userAnswer: "before ```\ncode\n``` after" },
      result: sampleResult,
      exportedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(md).toContain("````");
    expect(md).toContain("before ```");
  });

  it("flattens newlines inside bullet items", () => {
    const md = formatAnswerReviewAsMarkdown({
      request: { userAnswer: "x" },
      result: { ...sampleResult, strengths: ["line1\nline2"] },
      exportedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(md).toContain("- line1 line2");
  });
});

describe("sanitizeAnswerReviewFilenameSlug", () => {
  it("removes illegal filename characters and trims length", () => {
    expect(sanitizeAnswerReviewFilenameSlug('  Acme/Ltd: "X"  ')).toBe("AcmeLtd-X");
    expect(sanitizeAnswerReviewFilenameSlug("a".repeat(100)).length).toBe(60);
  });
});

describe("buildAnswerReviewExportFilename", () => {
  it("defaults to answer-review with ISO date", () => {
    const d = new Date("2026-03-02T15:00:00.000Z");
    expect(buildAnswerReviewExportFilename({}, d)).toBe("answer-review-2026-03-02.md");
  });

  it("joins company and role when present", () => {
    const d = new Date("2026-03-02T15:00:00.000Z");
    expect(buildAnswerReviewExportFilename({ company: "Acme Co", role: "Staff Eng" }, d)).toBe("Acme-Co-Staff-Eng-2026-03-02.md");
  });
});

describe("createMockAiAnswerReviewProvider", () => {
  it("delegates to mock review", async () => {
    const p = createMockAiAnswerReviewProvider();
    expect(p.id).toBe("mock");
    const r = await p.review({ userAnswer: "Short." });
    expect(r.score).toBeDefined();
  });
});

describe("resolveAnswerReviewProvider", () => {
  it("uses mock when OpenAI not preferred", () => {
    expect(resolveAnswerReviewProvider({ preferOpenAi: false, openAiApiKey: "sk-x" }).id).toBe("mock");
  });

  it("uses mock when preferred but key missing", () => {
    expect(resolveAnswerReviewProvider({ preferOpenAi: true, openAiApiKey: null }).id).toBe("mock");
  });

  it("uses OpenAI when preferred and key present", () => {
    expect(resolveAnswerReviewProvider({ preferOpenAi: true, openAiApiKey: "sk-test" }).id).toBe("openai");
  });
});

describe("createOpenAiAnswerReviewProvider", () => {
  it("throws on empty key", () => {
    expect(() => createOpenAiAnswerReviewProvider("  ")).toThrow(/empty/);
  });

  it("parses OpenAI chat response JSON", async () => {
    const payload = {
      score: 8,
      strengths: ["Clear structure"],
      improvements: ["Add metrics"],
      improvedVersion: "Better answer.",
      englishNotes: "Use active voice.",
      followUpPrompt: "Why this team?",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(payload) } }],
          }),
      }),
    );
    const p = createOpenAiAnswerReviewProvider("sk-fake");
    const r = await p.review({ userAnswer: "Hello world" });
    expect(r.score).toBe(8);
    expect(r.strengths[0]).toBe("Clear structure");
    vi.unstubAllGlobals();
  });
});
