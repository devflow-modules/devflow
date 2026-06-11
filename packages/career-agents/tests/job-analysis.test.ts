import { describe, expect, it } from "vitest";

import { analyzeJob } from "../src/job-analysis/analyze-job.js";
import {
  sampleFullstackSaasJob,
  sampleJobInput,
  sampleSeniorFrontendJob,
} from "../src/fixtures/sample-job.js";

describe("analyzeJob heuristics", () => {
  it("differentiates required vs nice-to-have sections", () => {
    const out = analyzeJob(sampleJobInput);
    expect(out.requiredSkills.map((s) => s.name)).toEqual(
      expect.arrayContaining(["React", "Next.js", "TypeScript", "Jest", "Playwright"]),
    );
    expect(out.niceToHaveSkills.map((s) => s.name)).toEqual(
      expect.arrayContaining(["Node.js", "GraphQL", "Docker", "GitHub Actions"]),
    );
    expect(out.requirementsDensity).toEqual({
      requiredCount: out.requiredSkills.length,
      niceToHaveCount: out.niceToHaveSkills.length,
    });
  });

  it("detects critical risk flags", () => {
    const out = analyzeJob(sampleSeniorFrontendJob);
    expect(out.riskFlags).toEqual(expect.arrayContaining(["presencial", "ingles_fluente"]));
  });

  it("detects domain signals for SaaS/fintech jobs", () => {
    const frontend = analyzeJob(sampleSeniorFrontendJob);
    const fullstack = analyzeJob(sampleFullstackSaasJob);

    expect(frontend.domainSignals).toEqual(expect.arrayContaining(["SaaS", "CRM"]));
    expect(fullstack.domainSignals).toEqual(
      expect.arrayContaining(["fintech", "health", "automation", "AI", "SaaS"]),
    );
    expect(fullstack.riskFlags).toEqual(
      expect.arrayContaining(["pj_obrigatorio", "disponibilidade_imediata"]),
    );
  });

  it("groups skills by category", () => {
    const out = analyzeJob(sampleFullstackSaasJob);
    expect(out.skillGroups?.frontend?.map((s) => s.name)).toEqual(
      expect.arrayContaining(["React", "Next.js", "TypeScript"]),
    );
    expect(out.skillGroups?.backend?.map((s) => s.name)).toEqual(
      expect.arrayContaining(["Node.js", "Express", "REST"]),
    );
  });

  it("includes seniority evidence", () => {
    const out = analyzeJob(sampleSeniorFrontendJob);
    expect(out.seniority).toBe("senior");
    expect(out.seniorityEvidence?.some((e) => /senior/i.test(e))).toBe(true);
  });
});
