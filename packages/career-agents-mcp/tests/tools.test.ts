import { describe, expect, it } from "vitest";

import {
  sampleFullstackSaasJob,
  sampleJuniorResume,
  sampleSeniorProductEngineerResume,
} from "@devflow/career-agents";

import {
  handleAnalyzeJob,
  handleAnalyzeResume,
  handleExplainGapSeverity,
  handleMatchResumeToJob,
} from "../src/index.js";

describe("analyze_job", () => {
  it("returns seniority and skills", () => {
    const out = handleAnalyzeJob(sampleFullstackSaasJob);
    expect(out.seniority).not.toBe("unknown");
    expect(out.requiredSkills.length).toBeGreaterThan(0);
  });

  it("handles minimal input", () => {
    const out = handleAnalyzeJob({ title: "Engineer", description: "" });
    expect(out.normalizedTitle).toBe("Engineer");
    expect(out.requiredSkills).toEqual([]);
  });
});

describe("analyze_resume", () => {
  it("returns skills and evidence", () => {
    const out = handleAnalyzeResume(sampleSeniorProductEngineerResume);
    expect(out.normalizedSkills.length).toBeGreaterThan(0);
    expect(out.skillEvidence).toBeDefined();
  });

  it("handles empty input", () => {
    expect(handleAnalyzeResume({}).normalizedSkills).toEqual([]);
  });
});

describe("match_resume_to_job", () => {
  it("returns score and gapSeverity", () => {
    const out = handleMatchResumeToJob({
      job: sampleFullstackSaasJob,
      resume: sampleJuniorResume,
    });
    expect(out.match.score).toBeGreaterThanOrEqual(0);
    expect(out.match.score).toBeLessThanOrEqual(100);
    expect(out.match.gapSeverity?.length).toBeGreaterThan(0);
    expect(out.jobAnalysis.requiredSkills.length).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    const input = { job: sampleFullstackSaasJob, resume: sampleSeniorProductEngineerResume };
    expect(handleMatchResumeToJob(input).match.score).toBe(handleMatchResumeToJob(input).match.score);
  });
});

describe("explain_gap_severity", () => {
  it("groups gaps by severity without LLM", () => {
    const { match } = handleMatchResumeToJob({
      job: sampleFullstackSaasJob,
      resume: sampleJuniorResume,
    });
    const out = handleExplainGapSeverity({ match });

    expect(out.summary).toMatch(/Overall match score:/);
    expect(out.highPriority.length).toBeGreaterThan(0);
    expect(Array.isArray(out.mediumPriority)).toBe(true);
    expect(Array.isArray(out.lowPriority)).toBe(true);
  });

  it("handles empty gapSeverity", () => {
    const out = handleExplainGapSeverity({
      match: {
        score: 80,
        matchedSkills: ["React"],
        missingSkills: [],
        evidenceGaps: [],
        suggestedImprovements: [],
      },
    });
    expect(out.summary).toContain("No structured gap severity");
    expect(out.highPriority).toEqual([]);
  });
});
