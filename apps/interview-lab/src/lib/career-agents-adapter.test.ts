import { describe, expect, it } from "vitest";

import {
  analyzeAtsWithCareerAgents,
  careerApplicationToJobInput,
  careerApplicationToResumeInput,
  plainTextToJobInput,
  plainTextToResumeInput,
  runCareerAgentsPipeline,
} from "./career-agents-adapter";

const RESUME = `
Senior Software Engineer
- Built customer dashboards with React and TypeScript
- Shipped APIs with Node.js and PostgreSQL
- Mentoring mid-level engineers on testing and CI/CD
`.trim();

const JOB = `
Senior Frontend Engineer — SaaS product team
Requirements: React, Next.js, TypeScript, Docker, GraphQL
We care about scalability, production reliability, and mentoring.
`.trim();

describe("plainTextToResumeInput", () => {
  it("parses headline and experience bullets", () => {
    const input = plainTextToResumeInput(RESUME);
    expect(input.headline).toBe("Senior Software Engineer");
    expect(input.experiences?.length).toBeGreaterThan(0);
    expect(input.experiences?.[0]?.description).toMatch(/React/i);
  });
});

describe("plainTextToJobInput", () => {
  it("uses first line as title and full text as description", () => {
    const input = plainTextToJobInput(JOB);
    expect(input.title).toContain("Senior Frontend Engineer");
    expect(input.description).toContain("GraphQL");
  });
});

describe("careerApplicationToJobInput", () => {
  it("maps CareerBundle application fields", () => {
    const input = careerApplicationToJobInput({
      id: "app-1",
      company: "Acme",
      role: "Senior Engineer",
      source: "manual",
      requiredSkills: ["React", "TypeScript"],
      status: "interview_scheduled",
      jobDescription: "Build SaaS dashboards.",
    });
    expect(input.title).toBe("Senior Engineer");
    expect(input.company).toBe("Acme");
    expect(input.description).toContain("React");
    expect(input.description).toContain("Build SaaS dashboards.");
  });
});

describe("careerApplicationToResumeInput", () => {
  it("maps bundle skills into resume hints", () => {
    const input = careerApplicationToResumeInput({
      id: "app-1",
      company: "Acme",
      role: "Frontend Engineer",
      source: "manual",
      requiredSkills: ["React", "Next.js"],
      status: "applied",
    });
    expect(input.skills).toEqual(["React", "Next.js"]);
    expect(input.headline).toBe("Frontend Engineer");
  });
});

describe("runCareerAgentsPipeline", () => {
  it("returns deterministic match with breakdown and gap severity", () => {
    const a = runCareerAgentsPipeline(RESUME, JOB);
    const b = runCareerAgentsPipeline(RESUME, JOB);
    expect(a.match).toEqual(b.match);
    expect(a.match.scoreBreakdown).toBeDefined();
    expect(a.match.gapSeverity?.length).toBeGreaterThan(0);
  });
});

describe("analyzeAtsWithCareerAgents", () => {
  it("maps to AtsAnalysisResult with score breakdown", () => {
    const result = analyzeAtsWithCareerAgents(RESUME, JOB);
    expect(result.matchedKeywords).toContain("React");
    expect(result.missingKeywords).toContain("GraphQL");
    expect(result.scoreBreakdown).toBeDefined();
    const sum =
      (result.scoreBreakdown?.requiredScore ?? 0) + (result.scoreBreakdown?.niceToHaveScore ?? 0);
    expect(sum).toBe(result.overallScore);
  });
});
