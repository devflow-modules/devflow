import { afterEach, describe, expect, it, vi } from "vitest";
import { parseAiResumeCoachingResponse, generateAiResumeCoaching } from "./aiResumeCoachingClient";
import { providerErrorUserMessage } from "@/lib/provider-error";

const ADVERSARIAL_BODY = "OPENAI_RAW_PROVIDER_SECRET_R3_7319";
const SYNTHETIC_KEY = "OPENAI_KEY_R3_SECRET_9287";

const VALID_JSON = JSON.stringify({
  professionalSummary: "Experienced engineer focused on shipping reliable SaaS features.",
  rewrittenBullets: [
    { original: "Built APIs", improved: "Shipped REST APIs with measurable latency wins.", reason: "Adds specificity." },
  ],
  jobSpecificPitch: "I match your stack and ownership bar; here is how I ship in production.",
  interviewTalkingPoints: ["Contrast testing vs monitoring for regressions."],
  weaknessDefenseStrategy: [{ gap: "AWS depth", suggestedAnswer: "STAR on ramping with certs + first project." }],
  resumeOptimizationChecklist: ["Echo missing keywords with honest projects."],
  finalRecommendation: "Iterate bullets with metrics, then rehearse pitch aloud.",
});

const sampleInput = {
  resumeText: "Engineer",
  jobDescriptionText: "Hiring engineer",
  atsAnalysis: {
    overallScore: 50,
    technicalScore: 50,
    seniorityScore: 50,
    keywordCoverageScore: 50,
    interviewReadinessScore: 50,
    matchedKeywords: [],
    missingKeywords: [],
    weakSignals: [],
    strengths: [],
    improvementSuggestions: [],
    rewrittenBullets: [],
    likelyInterviewQuestions: [],
    practiceContext: {
      resumeSummary: "r",
      jobSummary: "j",
      strengthsToDefend: [],
      gapsToPrepare: [],
      suggestedPitch: "p",
    },
  },
};

describe("parseAiResumeCoachingResponse", () => {
  it("accepts valid coaching JSON", () => {
    const r = parseAiResumeCoachingResponse(VALID_JSON);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.jobSpecificPitch.length).toBeGreaterThan(10);
  });

  it("rejects invalid payloads", () => {
    const r = parseAiResumeCoachingResponse("{}");
    expect(r.ok).toBe(false);
  });
});

describe("generateAiResumeCoaching", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unavailable when OpenAI is not configured", async () => {
    const r = await generateAiResumeCoaching(sampleInput, { preferOpenAi: false, openAiApiKey: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("unavailable");
  });

  it("maps HTTP provider failures to safe UI messages without leaking body or key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: { message: ADVERSARIAL_BODY } }),
      }),
    );

    const r = await generateAiResumeCoaching(sampleInput, {
      preferOpenAi: true,
      openAiApiKey: SYNTHETIC_KEY,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("network");
      expect(r.message).toBe(providerErrorUserMessage("provider_auth_failed"));
      expect(r.message).not.toContain(ADVERSARIAL_BODY);
      expect(r.message).not.toContain(SYNTHETIC_KEY);
      expect(JSON.stringify(r)).not.toContain(ADVERSARIAL_BODY);
      expect(JSON.stringify(r)).not.toContain(SYNTHETIC_KEY);
    }
  });

  it("maps invalid coaching shape to controlled parse message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ leak: ADVERSARIAL_BODY }) } }],
          }),
      }),
    );

    const r = await generateAiResumeCoaching(sampleInput, {
      preferOpenAi: true,
      openAiApiKey: SYNTHETIC_KEY,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("parse");
      expect(r.message).toBe(providerErrorUserMessage("provider_invalid_response"));
      expect(JSON.stringify(r)).not.toContain(ADVERSARIAL_BODY);
    }
  });
});
