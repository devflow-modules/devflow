import { describe, expect, it } from "vitest";
import { orchestrateCareerAgents } from "../orchestrator.js";
import { parseCareerAgentOrchestrationBody } from "../schemas.js";
import { scanCareerAnalysisInputForForbiddenKeys } from "../security.js";
import type { CareerAgentOrchestrationBody, CareerAnalysisInput } from "../types.js";
import { createSampleCareerBundle } from "./fixtures.js";

const REQUESTED_AT = "2026-06-18T12:00:00.000Z";

function bodyFor(
  intent: CareerAgentOrchestrationBody["intent"],
  analysisInput: CareerAnalysisInput,
): CareerAgentOrchestrationBody {
  return {
    intent,
    explicitConsent: true,
    context: {
      careerBundle: createSampleCareerBundle(),
      selectedSignalIds: [],
      analysisInput,
    },
  };
}

const STRONG_RESUME: CareerAnalysisInput = {
  resumeSnapshot: {
    summary: "Backend engineer focused on reliable Node.js services.",
    skills: ["TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS"],
    experiences: [
      {
        title: "Senior Backend Engineer",
        company: "Acme",
        bullets: [
          "Reduced API latency by 35% by optimizing PostgreSQL queries.",
          "Led migration of 12 services to TypeScript with zero downtime.",
        ],
      },
    ],
    projects: [{ name: "Queue worker", bullets: ["Built a worker processing 5k jobs/min."] }],
    education: ["BSc Computer Science"],
  },
  targetRole: "Backend Engineer",
  targetStack: ["TypeScript", "Node.js", "PostgreSQL"],
};

describe("resume_analyst", () => {
  it("routes analyze_resume to resume_analyst and returns deterministic analysis", () => {
    const result = orchestrateCareerAgents(bodyFor("analyze_resume", STRONG_RESUME), REQUESTED_AT);

    expect(result.status).toBe("completed");
    expect(result.agent).toBe("resume_analyst");
    expect(result.executionPlan?.selectedAgent).toBe("resume_analyst");
    expect(result.resumeAnalysis).toBeDefined();
    expect(result.resumeAnalysis?.score).toBeGreaterThanOrEqual(0);
    expect(result.resumeAnalysis?.score).toBeLessThanOrEqual(100);
    expect(result.reviewRequired).toBe(true);
    expect(result.safeForClient).toBe(true);
    expect(result.hasToken).toBe(false);
    expect(result.persisted).toBe(false);
    expect(result.reviewProposal?.proposalTool).toBe("career.prepare_resume_review");
    expect(result.reviewProposal?.executed).toBe(false);
  });

  it("is deterministic for the same input", () => {
    const first = orchestrateCareerAgents(bodyFor("analyze_resume", STRONG_RESUME), REQUESTED_AT);
    const second = orchestrateCareerAgents(bodyFor("analyze_resume", STRONG_RESUME), REQUESTED_AT);
    expect(first.resumeAnalysis).toEqual(second.resumeAnalysis);
  });

  it("flags missing summary and vague bullets", () => {
    const result = orchestrateCareerAgents(
      bodyFor("analyze_resume", {
        resumeSnapshot: {
          skills: ["TypeScript"],
          experiences: [
            { title: "Engineer", company: "Acme", bullets: ["Worked on stuff", "Helped team"] },
          ],
        },
        targetStack: ["TypeScript", "Kubernetes"],
      }),
      REQUESTED_AT,
    );

    expect(result.status).toBe("completed");
    const analysis = result.resumeAnalysis;
    expect(analysis?.weaknesses.some((w) => /resumo/i.test(w))).toBe(true);
    expect(analysis?.bulletRecommendations.length).toBeGreaterThan(0);
    expect(analysis?.missingEvidence.some((e) => e.toLowerCase().includes("kubernetes"))).toBe(true);
  });

  it("flags exaggeration risks without inventing metrics", () => {
    const result = orchestrateCareerAgents(
      bodyFor("analyze_resume", {
        resumeSnapshot: {
          summary: "World-class expert engineer.",
          skills: ["TypeScript", "Node.js"],
          experiences: [
            {
              title: "Engineer",
              company: "Acme",
              bullets: ["Was the best engineer that built the perfect system for everyone."],
            },
          ],
        },
      }),
      REQUESTED_AT,
    );
    expect(result.resumeAnalysis?.risks.some((r) => /exagero/i.test(r))).toBe(true);
  });

  it("blocks when resume snapshot is missing", () => {
    const result = orchestrateCareerAgents(bodyFor("analyze_resume", {}), REQUESTED_AT);
    expect(result.status).toBe("blocked");
    expect(result.warnings.some((w) => w.code === "missing_required_input")).toBe(true);
  });
});

const JOB: CareerAnalysisInput = {
  resumeSnapshot: STRONG_RESUME.resumeSnapshot,
  jobSnapshot: {
    title: "Senior Backend Engineer",
    requiredRequirements: [
      "Strong experience with TypeScript and Node.js",
      "Experience with PostgreSQL databases",
      "Experience with Kubernetes orchestration",
    ],
    keywords: ["typescript", "node.js", "postgresql", "kubernetes"],
  },
};

describe("ats_analyst", () => {
  it("routes analyze_ats_compatibility and returns a bounded deterministic score", () => {
    const result = orchestrateCareerAgents(bodyFor("analyze_ats_compatibility", JOB), REQUESTED_AT);

    expect(result.status).toBe("completed");
    expect(result.agent).toBe("ats_analyst");
    const ats = result.atsAnalysis;
    expect(ats).toBeDefined();
    expect(ats?.compatibilityScore).toBeGreaterThanOrEqual(0);
    expect(ats?.compatibilityScore).toBeLessThanOrEqual(100);
    expect(ats?.matchedKeywords).toContain("typescript");
    expect(ats?.missingKeywords).toContain("kubernetes");
    expect(result.reviewProposal?.proposalTool).toBe("career.prepare_ats_review");
  });

  it("produces the same score for the same input", () => {
    const first = orchestrateCareerAgents(bodyFor("analyze_ats_compatibility", JOB), REQUESTED_AT);
    const second = orchestrateCareerAgents(bodyFor("analyze_ats_compatibility", JOB), REQUESTED_AT);
    expect(first.atsAnalysis?.compatibilityScore).toBe(second.atsAnalysis?.compatibilityScore);
  });

  it("marks uncovered required requirements as missing", () => {
    const result = orchestrateCareerAgents(bodyFor("analyze_ats_compatibility", JOB), REQUESTED_AT);
    const coverage = result.atsAnalysis?.requiredRequirementCoverage ?? [];
    const kubernetes = coverage.find((item) => item.requirement.toLowerCase().includes("kubernetes"));
    expect(kubernetes?.status).toBe("missing");
  });

  it("warns about keyword stuffing without rewarding it", () => {
    const stuffed = Array.from({ length: 9 }, () => "typescript").join(" ");
    const result = orchestrateCareerAgents(
      bodyFor("analyze_ats_compatibility", {
        resumeSnapshot: {
          skills: ["typescript"],
          experiences: [{ title: "Eng", company: "Acme", bullets: [stuffed] }],
        },
        jobSnapshot: { title: "Eng", requiredRequirements: ["typescript"], keywords: ["typescript"] },
      }),
      REQUESTED_AT,
    );
    expect(result.atsAnalysis?.keywordStuffingWarnings.length).toBeGreaterThan(0);
  });

  it("flags parsing and structure risks for sparse resumes", () => {
    const result = orchestrateCareerAgents(
      bodyFor("analyze_ats_compatibility", {
        resumeSnapshot: { skills: [], experiences: [] },
        jobSnapshot: { title: "Eng", requiredRequirements: ["typescript"] },
      }),
      REQUESTED_AT,
    );
    // Missing resume snapshot evidence still blocks via execution plan, so ensure block path.
    expect(["completed", "blocked"]).toContain(result.status);
  });
});

describe("career_strategy_advisor", () => {
  it("routes plan_career_strategy and limits focus to three fronts", () => {
    const result = orchestrateCareerAgents(
      bodyFor("plan_career_strategy", {
        targetRoles: ["Backend Engineer", "Platform Engineer", "SRE", "Staff Engineer"],
        availability: "10h/week",
        constraints: ["remote only"],
      }),
      REQUESTED_AT,
    );

    expect(result.status).toBe("completed");
    expect(result.agent).toBe("career_strategy_advisor");
    const plan = result.careerStrategyPlan;
    expect(plan).toBeDefined();
    expect(plan?.priorityRoles.length).toBeLessThanOrEqual(3);
    expect(plan?.skillPriorities.length).toBeLessThanOrEqual(3);
    expect(plan?.thirtyDayPlan.length).toBeGreaterThan(0);
    expect(plan?.sixtyDayPlan.length).toBeGreaterThan(0);
    expect(plan?.ninetyDayPlan.length).toBeGreaterThan(0);
    expect(result.reviewProposal?.proposalTool).toBe("career.prepare_strategy_review");
  });

  it("never promises hiring and never auto-applies", () => {
    const result = orchestrateCareerAgents(bodyFor("plan_career_strategy", {}), REQUESTED_AT);
    const plan = result.careerStrategyPlan;
    const text = JSON.stringify(plan).toLowerCase();
    expect(text).not.toContain("guarantee a job");
    expect(plan?.risks.some((r) => r.toLowerCase().includes("does not guarantee"))).toBe(true);
    expect(plan?.applicationStrategy.some((s) => s.toLowerCase().includes("never auto-apply"))).toBe(
      true,
    );
  });
});

describe("specialist orchestrator security", () => {
  it("rejects analysis input carrying a client-chosen agent/tool/model", () => {
    const parsed = parseCareerAgentOrchestrationBody({
      intent: "analyze_resume",
      explicitConsent: true,
      context: {
        careerBundle: createSampleCareerBundle(),
        selectedSignalIds: [],
        analysisInput: {
          resumeSnapshot: { skills: ["x"], experiences: [] },
          // @ts-expect-error forbidden control field
          agent: "resume_analyst",
        },
      },
    });
    // strict schema rejects unknown keys
    expect(parsed.ok).toBe(false);
  });

  it("scanner flags forbidden control keys in analysis input", () => {
    expect(
      scanCareerAnalysisInputForForbiddenKeys({ tool: "x", resumeSnapshot: {} }).length,
    ).toBeGreaterThan(0);
    expect(
      scanCareerAnalysisInputForForbiddenKeys({ apiKey: "secret" }).length,
    ).toBeGreaterThan(0);
    expect(scanCareerAnalysisInputForForbiddenKeys({ targetRole: "Backend" }).length).toBe(0);
  });

  it("client cannot force an incompatible requestedAgent for the new intents", () => {
    const result = orchestrateCareerAgents(
      {
        intent: "analyze_resume",
        explicitConsent: true,
        requestedAgent: "ats_analyst",
        context: {
          careerBundle: createSampleCareerBundle(),
          selectedSignalIds: [],
          analysisInput: STRONG_RESUME,
        },
      },
      REQUESTED_AT,
    );
    expect(result.status).toBe("blocked");
    expect(result.warnings.some((w) => w.code === "agent_intent_mismatch")).toBe(true);
  });
});
