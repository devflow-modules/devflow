import { describe, expect, it } from "vitest";
import {
  handleCareerAgentOrchestration,
  parseCareerAgentOrchestrationRequest,
} from "./career-agent-orchestration-boundary.js";

describe("career-agent-orchestration-boundary", () => {
  it("parses valid orchestration request", () => {
    const parsed = parseCareerAgentOrchestrationRequest({
      intent: "analyze_application_fit",
      explicitConsent: true,
      context: {
        careerBundle: {
          schemaVersion: "1.0",
          exportedAt: "2026-06-16T12:00:00.000Z",
          sourceProduct: "applyflow",
          applications: [
            {
              id: "app-1",
              company: "Acme",
              role: "Backend Engineer",
              source: "linkedin",
              requiredSkills: ["TypeScript"],
              status: "applied",
            },
          ],
        },
        selectedSignalIds: [],
      },
    });

    expect(parsed.ok).toBe(true);
  });

  it("rejects unsafe payload values", () => {
    const parsed = parseCareerAgentOrchestrationRequest({
      intent: "analyze_application_fit",
      explicitConsent: true,
      context: {
        careerBundle: {
          schemaVersion: "1.0",
          exportedAt: "2026-06-16T12:00:00.000Z",
          sourceProduct: "applyflow",
          applications: [
            {
              id: "app-1",
              company: "Acme",
              role: "Backend Engineer",
              source: "linkedin",
              requiredSkills: ["TypeScript"],
              status: "applied",
              notes: "Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature",
            },
          ],
        },
        selectedSignalIds: [],
      },
    });

    expect(parsed.ok).toBe(false);
  });

  const baseCareerBundle = {
    schemaVersion: "1.0" as const,
    exportedAt: "2026-06-16T12:00:00.000Z",
    sourceProduct: "applyflow" as const,
    candidate: { targetRole: "Backend Engineer", mainStack: ["TypeScript"] },
    applications: [
      {
        id: "app-1",
        company: "Acme",
        role: "Backend Engineer",
        source: "linkedin" as const,
        requiredSkills: ["TypeScript", "PostgreSQL"],
        status: "applied" as const,
      },
    ],
  };

  it("routes analyze_resume to resume_analyst with client-safe output", () => {
    const result = handleCareerAgentOrchestration(
      {
        intent: "analyze_resume",
        explicitConsent: true,
        context: {
          careerBundle: baseCareerBundle,
          selectedSignalIds: [],
          analysisInput: {
            resumeSnapshot: {
              summary: "Backend engineer.",
              skills: ["TypeScript", "PostgreSQL"],
              experiences: [
                { title: "Engineer", company: "Acme", bullets: ["Built reliable APIs in Node."] },
              ],
            },
            targetRole: "Backend Engineer",
          },
        },
      },
      "2026-06-16T12:00:00.000Z",
    );

    expect(result.status).toBe("completed");
    expect(result.agent).toBe("resume_analyst");
    expect(result.resumeAnalysis).toBeDefined();
    expect(result.reviewProposal?.proposalTool).toBe("career.prepare_resume_review");
    expect(result.safeForClient).toBe(true);
    expect(result.persisted).toBe(false);
  });

  it("routes analyze_ats_compatibility to ats_analyst", () => {
    const result = handleCareerAgentOrchestration(
      {
        intent: "analyze_ats_compatibility",
        explicitConsent: true,
        context: {
          careerBundle: baseCareerBundle,
          selectedSignalIds: [],
          analysisInput: {
            resumeSnapshot: { skills: ["TypeScript"], experiences: [] },
            jobSnapshot: { title: "Backend", requiredRequirements: ["TypeScript"], keywords: ["typescript"] },
          },
        },
      },
      "2026-06-16T12:00:00.000Z",
    );

    expect(result.agent).toBe("ats_analyst");
    expect(result.atsAnalysis?.compatibilityScore).toBeGreaterThanOrEqual(0);
    expect(result.atsAnalysis?.compatibilityScore).toBeLessThanOrEqual(100);
  });

  it("routes plan_career_strategy to career_strategy_advisor", () => {
    const result = handleCareerAgentOrchestration(
      {
        intent: "plan_career_strategy",
        explicitConsent: true,
        context: {
          careerBundle: baseCareerBundle,
          selectedSignalIds: [],
          analysisInput: { targetRoles: ["Backend Engineer"], availability: "10h/week" },
        },
      },
      "2026-06-16T12:00:00.000Z",
    );

    expect(result.agent).toBe("career_strategy_advisor");
    expect(result.careerStrategyPlan?.priorityRoles.length).toBeLessThanOrEqual(3);
  });

  it("rejects analysis input with a client-chosen tool/model", () => {
    const parsed = parseCareerAgentOrchestrationRequest({
      intent: "analyze_resume",
      explicitConsent: true,
      context: {
        careerBundle: baseCareerBundle,
        selectedSignalIds: [],
        analysisInput: { resumeSnapshot: { skills: ["x"], experiences: [] }, tool: "career.modify_resume" },
      },
    });

    expect(parsed.ok).toBe(false);
  });

  it("always returns review-required client-safe results", () => {
    const result = handleCareerAgentOrchestration(
      {
        intent: "analyze_profile_gaps",
        explicitConsent: true,
        context: {
          careerBundle: {
            schemaVersion: "1.0",
            exportedAt: "2026-06-16T12:00:00.000Z",
            sourceProduct: "applyflow",
            applications: [
              {
                id: "app-1",
                company: "Acme",
                role: "Backend Engineer",
                source: "linkedin",
                requiredSkills: ["TypeScript", "Go"],
                status: "applied",
              },
            ],
          },
          selectedSignalIds: [],
        },
      },
      "2026-06-16T12:00:00.000Z",
    );

    expect(result.reviewRequired).toBe(true);
    expect(result.safeForClient).toBe(true);
    expect(result.hasToken).toBe(false);
  });
});
