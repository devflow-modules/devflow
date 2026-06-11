import { describe, expect, it } from "vitest";

import { matchJobToResume } from "../src/ats-analysis/match-job-resume.js";
import { analyzeJob } from "../src/job-analysis/analyze-job.js";
import { analyzeResume } from "../src/resume-analysis/analyze-resume.js";
import { sampleFullstackSaasJob, sampleJobInput } from "../src/fixtures/sample-job.js";
import {
  sampleJuniorResume,
  sampleResumeInput,
  sampleSeniorProductEngineerResume,
} from "../src/fixtures/sample-resume.js";

describe("matchJobToResume", () => {
  it("returns score, matchedSkills and missingSkills", () => {
    const job = analyzeJob(sampleJobInput);
    const resume = analyzeResume(sampleResumeInput);
    const match = matchJobToResume(job, resume);

    expect(match.score).toBeGreaterThan(0);
    expect(match.score).toBeLessThanOrEqual(100);
    expect(match.matchedSkills.length).toBeGreaterThan(0);
    expect(Array.isArray(match.missingSkills)).toBe(true);
    if (match.missingSkills.length > 0) {
      expect(match.suggestedImprovements.length).toBeGreaterThan(0);
    }
  });

  it("produces deterministic score", () => {
    const job = analyzeJob(sampleJobInput);
    const resume = analyzeResume(sampleResumeInput);
    expect(matchJobToResume(job, resume).score).toBe(matchJobToResume(job, resume).score);
  });

  it("handles empty resume skills", () => {
    const job = analyzeJob(sampleJobInput);
    const resume = analyzeResume({ headline: "Engineer" });
    const match = matchJobToResume(job, resume);

    expect(match.score).toBeGreaterThanOrEqual(0);
    expect(match.missingSkills.length).toBeGreaterThan(0);
  });

  it("exposes score breakdown that sums deterministically to score", () => {
    const job = analyzeJob(sampleFullstackSaasJob);
    const resume = analyzeResume(sampleSeniorProductEngineerResume);
    const match = matchJobToResume(job, resume);

    expect(match.scoreBreakdown).toBeDefined();
    const sum =
      (match.scoreBreakdown?.requiredScore ?? 0) + (match.scoreBreakdown?.niceToHaveScore ?? 0);
    expect(sum).toBe(match.score);
    expect(match.scoreBreakdown?.evidenceScore).toBeGreaterThanOrEqual(0);
    expect(match.scoreBreakdown?.evidenceScore).toBeLessThanOrEqual(100);
  });

  it("assigns gap severity high, medium and low", () => {
    const job = analyzeJob(sampleFullstackSaasJob);
    const resume = analyzeResume(sampleJuniorResume);
    const match = matchJobToResume(job, resume);

    expect(match.gapSeverity?.some((g) => g.severity === "high")).toBe(true);
    expect(match.gapSeverity?.some((g) => g.severity === "low")).toBe(true);
  });

  it("marks medium severity when required skill lacks strong evidence", () => {
    const job = analyzeJob({
      title: "Backend Engineer",
      description: "Requirements: Node.js, Express, PostgreSQL",
    });
    const resume = analyzeResume({
      skills: ["Node.js", "Express", "PostgreSQL"],
      summary: "Backend engineer",
    });
    const match = matchJobToResume(job, resume);

    expect(match.gapSeverity?.some((g) => g.severity === "medium")).toBe(true);
  });
});

describe("fixtures integration", () => {
  it("runs end-to-end on realistic fixtures without throwing", () => {
    const job = analyzeJob(sampleFullstackSaasJob);
    const resume = analyzeResume(sampleSeniorProductEngineerResume);
    const match = matchJobToResume(job, resume);

    expect(job.requiredSkills.length).toBeGreaterThan(0);
    expect(resume.normalizedSkills.length).toBeGreaterThan(0);
    expect(match.score).toBeGreaterThan(0);
  });
});
