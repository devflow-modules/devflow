import { describe, expect, it } from "vitest";

import { matchJobToResume } from "../src/ats-analysis/match-job-resume.js";
import { analyzeJob } from "../src/job-analysis/analyze-job.js";
import { analyzeResume } from "../src/resume-analysis/analyze-resume.js";
import { sampleJobInput } from "../src/fixtures/sample-job.js";
import { sampleResumeInput } from "../src/fixtures/sample-resume.js";

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
});
