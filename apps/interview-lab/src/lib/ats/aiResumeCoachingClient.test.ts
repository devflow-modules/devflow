import { describe, expect, it } from "vitest";
import { parseAiResumeCoachingResponse, generateAiResumeCoaching } from "./aiResumeCoachingClient";

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
  it("returns unavailable when OpenAI is not configured", async () => {
    const r = await generateAiResumeCoaching(
      {
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
      },
      { preferOpenAi: false, openAiApiKey: null },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("unavailable");
  });
});
