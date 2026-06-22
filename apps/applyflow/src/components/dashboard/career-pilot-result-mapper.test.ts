import { orchestrateCareerAgents } from "@devflow/career-core";
import { describe, expect, it } from "vitest";
import { buildCareerPilotResultModel, takeTopUnique } from "./career-pilot-result-mapper";
import { createCareerBundle } from "@devflow/career-core";

const bundle = createCareerBundle([
  {
    id: "app-1",
    company: "Acme",
    role: "Backend Engineer",
    source: "linkedin",
    requiredSkills: ["TypeScript"],
    status: "applied",
  },
]);

describe("takeTopUnique", () => {
  it("returns at most three unique trimmed items", () => {
    expect(takeTopUnique([" a ", "a", "b", "c", "d"], 3)).toEqual(["a", "b", "c"]);
  });
});

describe("buildCareerPilotResultModel", () => {
  it("orders resume results with summary and actions before technical metadata", () => {
    const agentResult = orchestrateCareerAgents(
      {
        intent: "analyze_resume",
        explicitConsent: true,
        context: {
          careerBundle: bundle,
          selectedSignalIds: [],
          analysisInput: {
            resumeSnapshot: {
              skills: ["TypeScript", "Node.js"],
              experiences: [
                {
                  title: "Engineer",
                  company: "Acme",
                  bullets: ["Reduced API latency by 35%"],
                },
              ],
            },
            targetRole: "Backend Engineer",
          },
        },
      },
      "2026-06-21T12:00:00.000Z",
    );

    const response = {
      status: "completed" as const,
      intent: "analyze_resume" as const,
      reviewRequired: true,
      safeForClient: true,
      hasToken: false,
      persisted: false,
      executedExternally: false,
      warnings: [],
      toolProposals: [],
      trace: { steps: [{ code: "review_required", message: "Human review", timestamp: "t" }] },
      agentResult,
    };

    const model = buildCareerPilotResultModel({ intent: "analyze_resume", response });
    expect(model?.flowTitle).toBe("Análise do currículo");
    expect(model?.summary.length).toBeGreaterThan(0);
    expect(model?.nextActions.length).toBeLessThanOrEqual(3);
    expect(model?.scores[0]?.label).toBe("Qualidade da estrutura");
    expect(model?.summary).toMatch(/Análise concluída/i);
    expect(model?.technicalLines).toEqual([]);
    expect(model?.traceSteps).toEqual([]);
  });

  it("exposes diagnostic metadata outside participant surface", () => {
    const agentResult = orchestrateCareerAgents(
      {
        intent: "analyze_resume",
        explicitConsent: true,
        context: {
          careerBundle: bundle,
          selectedSignalIds: [],
          analysisInput: {
            resumeSnapshot: {
              skills: ["TypeScript", "Node.js"],
              experiences: [
                {
                  title: "Engineer",
                  company: "Acme",
                  bullets: ["Reduced API latency by 35%"],
                },
              ],
            },
            targetRole: "Backend Engineer",
          },
        },
      },
      "2026-06-21T12:00:00.000Z",
    );

    const response = {
      status: "completed" as const,
      intent: "analyze_resume" as const,
      reviewRequired: true,
      safeForClient: true,
      hasToken: false,
      persisted: false,
      executedExternally: false,
      warnings: [],
      toolProposals: [],
      trace: { steps: [{ code: "review_required", message: "Human review", timestamp: "t" }] },
      agentResult,
    };

    const model = buildCareerPilotResultModel({
      intent: "analyze_resume",
      response,
      participantSurface: false,
    });
    expect(model?.technicalLines.some((line) => line.includes("Nenhuma candidatura"))).toBe(true);
    expect(model?.traceSteps.length).toBeGreaterThan(0);
  });

  it("maps ATS score label to compatibilidade estimada", () => {
    const agentResult = orchestrateCareerAgents(
      {
        intent: "analyze_ats_compatibility",
        explicitConsent: true,
        context: {
          careerBundle: bundle,
          selectedSignalIds: [],
          analysisInput: {
            resumeSnapshot: {
              skills: ["TypeScript", "Node.js"],
              experiences: [{ title: "Engineer", company: "Acme", bullets: ["Built APIs"] }],
            },
            jobSnapshot: {
              title: "Backend Engineer",
              requiredRequirements: ["TypeScript", "Node.js", "PostgreSQL"],
              keywords: ["typescript", "node", "postgresql"],
            },
          },
        },
      },
      "2026-06-21T12:00:00.000Z",
    );

    const model = buildCareerPilotResultModel({
      intent: "analyze_ats_compatibility",
      response: {
        status: "completed",
        intent: "analyze_ats_compatibility",
        reviewRequired: true,
        safeForClient: true,
        hasToken: false,
        persisted: false,
        executedExternally: false,
        warnings: [],
        toolProposals: [],
        trace: { steps: [] },
        agentResult,
      },
    });

    expect(model?.flowTitle).toBe("Compatibilidade com a vaga");
    expect(model?.scores[0]?.label).toBe("Compatibilidade estimada");
  });

  it("returns null for incomplete completed responses without summary", () => {
    const model = buildCareerPilotResultModel({
      intent: "analyze_resume",
      response: {
        status: "completed",
        intent: "analyze_resume",
        reviewRequired: true,
        safeForClient: true,
        hasToken: false,
        persisted: false,
        executedExternally: false,
        agentResult: {
          status: "completed",
          agent: "resume_analyst",
          summary: "",
          findings: [],
          recommendations: [],
          evidence: [],
          warnings: [],
          reviewRequired: true,
          safeForClient: true,
          hasToken: false,
          rawProviderDataUsed: false,
          persisted: false,
          trace: { requestId: "req-1", steps: [] },
        },
      } as never,
    });

    expect(model).toBeNull();
  });

  it("does not crash when optional analysis arrays are missing", () => {
    const model = buildCareerPilotResultModel({
      intent: "analyze_resume",
      response: {
        status: "completed",
        intent: "analyze_resume",
        reviewRequired: true,
        safeForClient: true,
        hasToken: false,
        persisted: false,
        executedExternally: false,
        warnings: [],
        toolProposals: [],
        trace: { steps: [] },
        agentResult: {
          status: "completed",
          agent: "resume_analyst",
          summary: "Resumo parcial",
          findings: [],
          recommendations: [],
          evidence: [],
          warnings: [],
          reviewRequired: true,
          safeForClient: true,
          hasToken: false,
          rawProviderDataUsed: false,
          persisted: false,
          trace: { requestId: "req-1", steps: [] },
          resumeAnalysis: {
            score: 50,
          },
        },
      } as never,
    });

    expect(model?.summary).toBe("Resumo parcial");
    expect(model?.strengths).toEqual([]);
  });
});
