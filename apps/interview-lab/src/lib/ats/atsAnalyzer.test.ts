import { describe, expect, it } from "vitest";
import { analyzeAtsMatch } from "./atsAnalyzer";

const RESUME = `
Senior Software Engineer
- Built customer dashboards with React and TypeScript
- Shipped APIs with Node.js and PostgreSQL
- Mentoring mid-level engineers on testing and CI/CD
`.trim();

const JOB = `
Senior Frontend Engineer — SaaS product team
Requirements: React, Next.js, TypeScript, AWS, Docker, GraphQL
We care about scalability, production reliability, and mentoring.
`.trim();

describe("analyzeAtsMatch", () => {
  it("is deterministic for identical inputs", () => {
    const a = analyzeAtsMatch(RESUME, JOB);
    const b = analyzeAtsMatch(RESUME, JOB);
    expect(a).toEqual(b);
  });

  it("detects matched and missing canonical tech keywords", () => {
    const r = analyzeAtsMatch(RESUME, JOB);
    expect(r.matchedKeywords).toContain("React");
    expect(r.matchedKeywords).toContain("TypeScript");
    expect(r.missingKeywords).toContain("AWS");
    expect(r.missingKeywords).toContain("Docker");
  });

  it("produces bounded scores", () => {
    const r = analyzeAtsMatch(RESUME, JOB);
    for (const k of [
      "overallScore",
      "technicalScore",
      "seniorityScore",
      "keywordCoverageScore",
      "interviewReadinessScore",
    ] as const) {
      expect(r[k]).toBeGreaterThanOrEqual(0);
      expect(r[k]).toBeLessThanOrEqual(100);
    }
  });

  it("builds practice context with non-empty summaries", () => {
    const r = analyzeAtsMatch(RESUME, JOB);
    expect(r.practiceContext.resumeSummary.length).toBeGreaterThan(10);
    expect(r.practiceContext.jobSummary.length).toBeGreaterThan(10);
    expect(r.practiceContext.strengthsToDefend.length).toBeGreaterThan(0);
    expect(r.practiceContext.gapsToPrepare.length).toBeGreaterThan(0);
    expect(r.practiceContext.suggestedPitch.length).toBeGreaterThan(20);
  });

  it("generates likely interview questions sorted", () => {
    const r = analyzeAtsMatch(RESUME, JOB);
    const sorted = [...r.likelyInterviewQuestions].sort((a, b) => a.localeCompare(b));
    expect(r.likelyInterviewQuestions).toEqual(sorted);
    expect(r.likelyInterviewQuestions.length).toBeGreaterThan(0);
  });

  it("returns empty analysis-friendly output for minimal empty-ish job tech", () => {
    const r = analyzeAtsMatch("Engineer with Python experience.", "We need someone collaborative and curious.");
    expect(r.matchedKeywords.length).toBe(0);
    expect(r.overallScore).toBeGreaterThanOrEqual(0);
  });
});
