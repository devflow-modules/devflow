import { describe, expect, it } from "vitest";

import { analyzeJob } from "../src/job-analysis/analyze-job.js";
import { sampleJobInput } from "../src/fixtures/sample-job.js";

describe("analyzeJob", () => {
  it("detects seniority and skills from sample job", () => {
    const out = analyzeJob(sampleJobInput);

    expect(out.normalizedTitle).toBe("Senior Frontend Engineer");
    expect(out.seniority).toBe("senior");
    expect(out.requiredSkills.map((s) => s.name)).toEqual(
      expect.arrayContaining(["React", "Next.js", "TypeScript", "Tailwind CSS", "Jest", "Playwright"]),
    );
    expect(out.niceToHaveSkills.map((s) => s.name)).toEqual(
      expect.arrayContaining(["Node.js", "GraphQL", "Docker", "GitHub Actions"]),
    );
    expect(out.interviewTopics.length).toBeGreaterThan(0);
  });

  it("handles minimal input without throwing", () => {
    const out = analyzeJob({ title: "Engineer", description: "" });

    expect(out.normalizedTitle).toBe("Engineer");
    expect(out.seniority).toBe("unknown");
    expect(out.requiredSkills).toEqual([]);
    expect(out.riskFlags).toContain("short_description");
  });

  it("is deterministic for the same input", () => {
    const a = analyzeJob(sampleJobInput);
    const b = analyzeJob(sampleJobInput);
    expect(a).toEqual(b);
  });
});
