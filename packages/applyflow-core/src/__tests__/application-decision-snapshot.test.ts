import { describe, expect, it } from "vitest";

import { captureApplicationDecisionSnapshot, parseApplicationDecisionSnapshot } from "../application-decision-snapshot.js";
import { mergeOutcome } from "../application-outcome.js";
import type { ApplicationPackV2 } from "../application-pack-v2.js";
import {
  computeCaseUsage,
  computeEvidenceUsage,
  computeFitBandPerformance,
  computePriorityPerformance,
  computeResumePerformance,
  historicalDecisionsFromSnapshots,
} from "../career-analytics.js";
import type { ApplicationOutcome } from "../career-analytics-types.js";
import { createApplyFlowCareerBundleV2, parseApplyFlowCareerBundle, serializeApplyFlowCareerBundleV2 } from "../career-bundle-v2.js";
import type { JobDecisionV2 } from "../application-decision-types.js";
import type { ApplyFlowApplicationV2Envelope } from "../application-record-v2.js";
import type { EvidenceMatch } from "../evidence-matching.js";
import type { JobRequirement } from "../job-requirement-types.js";

const NOW = new Date("2026-09-09T12:00:00.000Z");

function requirement(label = "Elixir"): JobRequirement {
  return {
    id: `req-${label.toLowerCase()}`,
    label,
    category: "backend",
    importance: "important",
    requirementType: "skill",
  };
}

function match(status: EvidenceMatch["status"], label = "Elixir"): EvidenceMatch {
  return { requirement: requirement(label), status, matchedEvidence: [], reason: status };
}

function decision(status: EvidenceMatch["status"] = "gap"): JobDecisionV2 {
  return {
    scoringVersion: "v2",
    decision: "apply_normal",
    overall: 64,
    dimensions: {
      overall: 64,
      coreEngineering: 80,
      stack: 55,
      specialization: 50,
      seniority: 70,
      product: 75,
    },
    confidence: "medium",
    hiringProbability: "medium",
    careerUpside: "medium",
    applicationCost: "medium",
    opportunityCost: "medium",
    eliminationRisk: "medium",
    priority: 58,
    matches: [match(status)],
    claims: [],
    recommendedClaims: [],
    gates: [],
    candidateInputRequests: [],
    reasons: ["fixture"],
  };
}

function application(id = "app-1"): ApplyFlowApplicationV2Envelope {
  return {
    id,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    source: "linkedin",
    status: "applied",
    jobTitle: "Product Engineer",
    v2: { sourceJobId: "job-1" },
  };
}

function outcomeWithSnapshot(patch: Partial<ApplicationOutcome> = {}): ApplicationOutcome {
  const snapshot = captureApplicationDecisionSnapshot({
    decision: decision("gap"),
    supportingEvidenceIds: ["seed-whatsapp-platform"],
    primaryCaseIds: ["seed-whatsapp-platform"],
    resumeVariant: "product-engineer",
    now: NOW,
  });
  return {
    applicationId: "app-1",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    snapshot,
    fitAtApplication: snapshot.overallFit,
    decisionAtApplication: snapshot.decision,
    priorityAtApplication: snapshot.priority,
    resumeVariant: snapshot.resumeVariant,
    ...patch,
  };
}

describe("application decision snapshot", () => {
  it("keeps historical requirement status when a later decision would flip the match", () => {
    const frozen = outcomeWithSnapshot();
    const later = captureApplicationDecisionSnapshot({ decision: decision("proven"), now: new Date("2026-09-10T00:00:00.000Z") });
    expect(later.requirements[0]?.status).toBe("proven");
    const merged = mergeOutcome(frozen, { snapshot: later, screeningAt: "2026-09-10T00:00:00.000Z" }, NOW);
    expect(merged.snapshot?.requirements[0]?.status).toBe("gap");
    expect(merged.snapshot?.overallFit).toBe(64);
    expect(merged.screeningAt).toBe("2026-09-10T00:00:00.000Z");

    const records = historicalDecisionsFromSnapshots({
      applications: [application()],
      outcomes: [merged],
    });
    expect(records).toHaveLength(1);
    expect(records[0]?.applicationId).toBe("app-1");
    expect(records[0]?.jobId).toBe("job-1");
    expect(records[0]?.matches[0]?.status).toBe("gap");
  });

  it("derives evidence and case usage from snapshot IDs without a persisted pack", () => {
    const applications = [application()];
    const outcomes = [outcomeWithSnapshot()];
    const evidence = computeEvidenceUsage({ applications, outcomes, now: NOW });
    const cases = computeCaseUsage({ applications, outcomes, now: NOW });
    expect(evidence[0]?.evidenceId).toBe("seed-whatsapp-platform");
    expect(evidence[0]?.applications).toBe(1);
    expect(cases[0]?.case).toBe("seed-whatsapp-platform");
    expect(cases[0]?.timesRecommended).toBe(1);
    expect(JSON.stringify(outcomes[0])).not.toMatch(/headline|recommendedAnswer|connectionRequest/);
  });

  it("extracts pack IDs only and ignores generated copy on parse", () => {
    const pack = {
      version: 2,
      jobId: "job-1",
      status: "ready",
      decision: "apply_normal",
      resumeRecommendation: { variant: { id: "product-engineer" } },
      applicationAnswers: [{ supportingEvidenceIds: ["ev-answer"] }],
      binaryQuestions: [],
      claimAudit: {
        finalSafe: [{ supportingEvidence: [{ id: "ev-claim" }] }],
        safeCount: 1,
        defensibleCount: 0,
        removedCount: 0,
      },
      candidateInputs: [],
      gates: [],
      cvPersonalization: {
        experienceChanges: [{ supportingEvidenceIds: ["ev-cv"] }],
        skillsChanges: [],
      },
      interviewBrief: { recommendedCases: [{ evidenceIds: ["ev-case"] }] },
    } as unknown as ApplicationPackV2;
    const snapshot = captureApplicationDecisionSnapshot({
      decision: decision("partial"),
      pack,
      now: NOW,
    });
    expect(snapshot.resumeVariant).toBe("product-engineer");
    expect(snapshot.supportingEvidenceIds).toEqual(expect.arrayContaining(["ev-answer", "ev-cv", "ev-claim"]));
    expect(snapshot.primaryCaseIds).toEqual(["ev-case"]);

    const parsed = parseApplicationDecisionSnapshot({
      ...snapshot,
      headline: "should not persist",
      recommendedAnswer: "drop me",
      connectionRequest: "drop me too",
    });
    expect(parsed).toBeDefined();
    expect(parsed).not.toHaveProperty("headline");
    expect(parsed).not.toHaveProperty("recommendedAnswer");
  });

  it("round-trips snapshot on CareerBundle V2 without derived metrics", () => {
    const original = createApplyFlowCareerBundleV2({
      applications: [application()],
      outcomes: [outcomeWithSnapshot()],
    });
    const again = parseApplyFlowCareerBundle(serializeApplyFlowCareerBundleV2(original));
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.bundle.outcomes[0]?.snapshot?.supportingEvidenceIds).toEqual(["seed-whatsapp-platform"]);
    expect(again.bundle.outcomes[0]?.snapshot?.requirements[0]?.status).toBe("gap");
    expect(JSON.stringify(again.bundle)).not.toContain("responseRate");
  });

  it("fit, decision, priority and resume metrics prefer the snapshot over later patches", () => {
    const frozen = outcomeWithSnapshot({
      fitAtApplication: 91,
      decisionAtApplication: "apply_high",
      priorityAtApplication: 90,
      resumeVariant: "rewritten-later",
    });
    const merged = mergeOutcome(
      frozen,
      { fitAtApplication: 91, decisionAtApplication: "apply_high", priorityAtApplication: 90, resumeVariant: "rewritten-later" },
      NOW,
    );
    expect(merged.fitAtApplication).toBe(64);
    expect(merged.decisionAtApplication).toBe("apply_normal");
    expect(merged.priorityAtApplication).toBe(58);
    expect(merged.resumeVariant).toBe("product-engineer");

    const applications = [application()];
    const outcomes = [merged];
    expect(computeFitBandPerformance({ applications, outcomes, now: NOW }).find((item) => item.band === "60-69")?.applications).toBe(1);
    expect(computePriorityPerformance({ applications, outcomes, now: NOW }).find((item) => item.key === "apply_normal")?.applications).toBe(1);
    expect(computeResumePerformance({ applications, outcomes, now: NOW })[0]?.resumeVariant).toBe("product-engineer");
  });

  it("editar o perfil na biblioteca não muta um snapshot já capturado", () => {
    const snapshot = captureApplicationDecisionSnapshot({
      decision: decision("unknown"),
      resumeVariant: "rv_principal",
      now: NOW,
    });
    const stored = { snapshot };
    const frozen = structuredClone(stored.snapshot);
    const laterProfile = { name: "Ana Costa", roles: ["Engineer"], englishLevel: "Fluent" };
    expect(laterProfile.englishLevel).toBe("Fluent");
    expect(stored.snapshot).toEqual(frozen);
    expect(stored.snapshot.requirements[0]?.status).toBe("unknown");
  });
});
