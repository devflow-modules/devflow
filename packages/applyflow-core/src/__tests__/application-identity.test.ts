import { describe, expect, it } from "vitest";

import { applyCareerFeedback } from "../application-outcome.js";
import { computeFunnelMetrics } from "../career-analytics.js";
import {
  canRecordApplicationOutcome,
  createApplicationFromJob,
  findApplicationForJob,
  markApplicationSubmitted,
  outcomeBelongsToApplication,
} from "../application-identity.js";
import type { JobDecisionV2 } from "../application-decision-types.js";
import type { ApplyFlowJob } from "../job-match-types.js";

const NOW = new Date("2026-09-09T12:00:00.000Z");

const decision: JobDecisionV2 = {
  scoringVersion: "v2",
  decision: "apply_high",
  overall: 88,
  dimensions: {
    overall: 88,
    coreEngineering: 90,
    stack: 85,
    specialization: 80,
    seniority: 84,
    product: 92,
  },
  confidence: "high",
  hiringProbability: "high",
  careerUpside: "high",
  applicationCost: "medium",
  opportunityCost: "low",
  eliminationRisk: "low",
  priority: 86,
  matches: [],
  claims: [],
  recommendedClaims: [],
  gates: [],
  candidateInputRequests: [],
  reasons: ["fixture"],
};

function job(id = "job-99"): ApplyFlowJob {
  return {
    id,
    title: "Product Engineer",
    company: "Acme",
    url: "https://jobs.example/acme-pe",
    source: "linkedin",
    status: "reviewing",
    jobContext: { skills: ["TypeScript"] },
    jobMatch: {
      score: 70,
      decision: "apply",
      matchedSkills: ["TypeScript"],
      missingSkills: [],
      evaluatedAt: NOW.toISOString(),
      scoringVersion: "v1",
    },
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  };
}

describe("application / outcome identity", () => {
  it("creates an Application whose id is not the job id and binds Outcome to it", () => {
    const created = createApplicationFromJob({ job: job(), decision, now: NOW });
    expect(created.application.id).not.toBe("job-99");
    expect(created.application.v2?.sourceJobId).toBe("job-99");
    expect(created.application.status).toBe("reviewing");
    expect(created.outcome.applicationId).toBe(created.application.id);
    expect(created.outcome.snapshot?.decision).toBe("apply_high");
    expect(created.outcome.snapshot?.overallFit).toBe(88);
    expect(outcomeBelongsToApplication(created.outcome, [created.application])).toBe(true);
    expect(canRecordApplicationOutcome("job-99", [created.application])).toBe(false);
  });

  it("records the pack resume variant id on the immutable snapshot", () => {
    const created = createApplicationFromJob({
      job: job(),
      decision,
      now: NOW,
      pack: {
        applicationAnswers: [],
        claimAudit: { finalSafe: [], safeCount: 0, defensibleCount: 0, removedCount: 0 },
        resumeRecommendation: { variant: { id: "rv_frontend" } },
      } as never,
    });
    expect(created.application.v2?.resumeVariant).toBe("rv_frontend");
    expect(created.outcome.snapshot?.resumeVariant).toBe("rv_frontend");
    expect(created.outcome.resumeVariant).toBe("rv_frontend");
  });

  it("refuses to mint an Application that reuses the job id", () => {
    expect(() => createApplicationFromJob({ job: job(), decision, applicationId: "job-99", now: NOW })).toThrow(
      /must not equal job id/i,
    );
  });

  it("finds Application by sourceJobId or jobUrl, never by treating job id as application id", () => {
    const listed = job();
    expect(findApplicationForJob([{ id: listed.id, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), source: "linkedin", status: "reviewing" }], listed)).toBeUndefined();

    const bySource = {
      id: "app-real",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      source: "linkedin" as const,
      status: "reviewing" as const,
      v2: { sourceJobId: listed.id },
    };
    expect(findApplicationForJob([bySource], listed)?.id).toBe("app-real");

    const byUrl = {
      id: "app-url",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      source: "linkedin" as const,
      status: "reviewing" as const,
      jobUrl: listed.url,
    };
    expect(findApplicationForJob([byUrl], listed)?.id).toBe("app-url");
  });

  it("rejects feedback that attaches a job-scoped outcome to a different Application", () => {
    const created = createApplicationFromJob({ job: job(), decision, now: NOW, applicationId: "app-real" });
    expect(() =>
      applyCareerFeedback({
        application: created.application,
        outcome: { ...created.outcome, applicationId: "job-99" },
        action: "screening",
        now: NOW,
      }),
    ).toThrow(/applicationId/i);
  });

  it("marcar como enviada actualiza o mesmo registo e o funil APPLIED, sem novo id nem novo snapshot", () => {
    const created = createApplicationFromJob({ job: job(), decision, now: NOW, applicationId: "app-real" });
    const later = new Date("2026-09-09T13:00:00.000Z");
    const submitted = markApplicationSubmitted(created.application, later);

    expect(submitted.id).toBe(created.application.id);
    expect(submitted.v2?.sourceJobId).toBe("job-99");
    expect(submitted.status).toBe("applied");
    expect(submitted.updatedAt).toBe(later.toISOString());
    expect(created.outcome.snapshot?.overallFit).toBe(88);
    expect(markApplicationSubmitted(submitted, later)).toBe(submitted);

    const before = computeFunnelMetrics({
      applications: [created.application],
      outcomes: [created.outcome],
    });
    const after = computeFunnelMetrics({
      applications: [submitted],
      outcomes: [created.outcome],
    });
    expect(before.counts.APPLIED).toBe(0);
    expect(after.counts.APPLIED).toBe(1);
    expect(after.sampleSize).toBe(1);
  });
});
