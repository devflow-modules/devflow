import { describe, expect, it } from "vitest";

import { analyzeResume } from "../src/resume-analysis/analyze-resume.js";
import {
  sampleJuniorResume,
  sampleResumeInput,
  sampleSeniorProductEngineerResume,
} from "../src/fixtures/sample-resume.js";

describe("analyzeResume", () => {
  it("normalizes and deduplicates skills", () => {
    const out = analyzeResume({
      ...sampleResumeInput,
      skills: ["react", "React", "TypeScript", "typescript"],
    });

    const names = out.normalizedSkills.map((s) => s.name.toLowerCase());
    expect(names.filter((n) => n === "react").length).toBe(1);
    expect(names.filter((n) => n === "typescript").length).toBe(1);
    expect(out.normalizedSkills.length).toBeGreaterThanOrEqual(2);
  });

  it("derives seniority signals from experience titles", () => {
    const out = analyzeResume(sampleResumeInput);
    expect(out.senioritySignals.some((s) => /senior/i.test(s))).toBe(true);
  });

  it("differentiates loose skills vs project evidence", () => {
    const out = analyzeResume(sampleJuniorResume);

    expect(out.normalizedSkills.map((s) => s.name)).toContain("Tailwind CSS");
    expect(out.weakEvidence.some((e) => /listed in skills without project/i.test(e))).toBe(true);
    expect(out.portfolioOpportunities.length).toBeGreaterThan(0);
    expect(out.skillEvidence?.["tailwind css"]).toBeDefined();
  });

  it("marks strong evidence for senior product engineer resume", () => {
    const out = analyzeResume(sampleSeniorProductEngineerResume);

    expect(out.strongestEvidence.some((e) => /explicit stack/i.test(e))).toBe(true);
    expect(out.skillEvidence?.react).toBe("strong");
    expect(out.skillEvidence?.prisma).toBe("strong");
  });

  it("handles empty input without throwing", () => {
    const out = analyzeResume({});
    expect(out.normalizedSkills).toEqual([]);
    expect(out.missingEvidence.length).toBeGreaterThan(0);
  });
});
