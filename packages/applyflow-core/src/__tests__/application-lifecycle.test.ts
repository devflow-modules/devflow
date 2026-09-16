import { describe, expect, it } from "vitest";

import type { JobDecisionV2 } from "../application-decision-types.js";
import { createApplicationFromJob, markApplicationSubmitted } from "../application-identity.js";
import {
  analysesDiverge,
  analysisAtApplyFromOutcome,
  APPLICATION_LIFECYCLE_TRANSITIONS,
  backfillClosedLoopV1,
  canTransitionApplicationStatus,
  formatLifecycleEventDate,
  getApplicationLifecycleView,
  transitionApplicationStatus,
} from "../application-lifecycle.js";
import { mergeOutcome } from "../application-outcome.js";
import type { ApplyFlowApplication } from "../application-types.js";
import type { ApplicationOutcome } from "../career-analytics-types.js";
import type { ApplyFlowJob } from "../job-match-types.js";
import type { ApplyFlowPipelineStatusV2 } from "../pipeline-status.js";

const NOW = new Date("2026-09-15T03:04:24.620Z");

const applyDecision: JobDecisionV2 = {
  scoringVersion: "v2",
  decision: "apply_normal",
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

const inconclusiveDecision: JobDecisionV2 = {
  ...applyDecision,
  decision: "needs_info",
  overall: 58,
  dimensions: { ...applyDecision.dimensions, overall: 58 },
  priority: 40,
};

function job(id = "job-1"): ApplyFlowJob {
  return {
    id,
    title: "React Engineer",
    company: "Bluelight Consulting",
    url: "https://jobs.example/bluelight",
    source: "linkedin",
    status: "reviewing",
    jobContext: { skills: ["React"] },
    jobMatch: {
      score: 88,
      decision: "apply",
      matchedSkills: ["React"],
      missingSkills: [],
      evaluatedAt: NOW.toISOString(),
      scoringVersion: "v1",
    },
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  };
}

describe("application lifecycle", () => {
  it("marking applied preserves analysis snapshot and does not imply APPLY", () => {
    const created = createApplicationFromJob({
      job: job("job_witi"),
      decision: inconclusiveDecision,
      now: new Date("2026-09-14T16:00:53.951Z"),
      applicationId: "app_mu1fjkqn_job_mu0ygffs_36p8r3bb",
    });
    expect(created.application.status).toBe("reviewing");
    expect(created.outcome.snapshot?.decision).toBe("needs_info");
    expect(created.outcome.snapshot?.overallFit).toBe(58);

    const sent = transitionApplicationStatus({
      application: created.application,
      outcome: created.outcome,
      toStatus: "applied",
      now: NOW,
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    expect(sent.application.status).toBe("applied");
    expect(sent.outcome.snapshot?.decision).toBe("needs_info");
    expect(sent.outcome.snapshot?.overallFit).toBe(58);
    expect(sent.outcome.appliedAt).toBe("2026-09-15T03:04:24.620Z");
    expect(sent.outcome.lastActivityAt).toBe("2026-09-15T03:04:24.620Z");
    expect(sent.event?.type).toBe("applied");
    expect(analysisAtApplyFromOutcome(sent.outcome)?.recommendation).toBe("needs_info");
  });

  it("INCONCLUSIVA application can be APPLIED", () => {
    const created = createApplicationFromJob({
      job: job(),
      decision: inconclusiveDecision,
      now: NOW,
    });
    const sent = transitionApplicationStatus({
      application: created.application,
      outcome: created.outcome,
      toStatus: "applied",
      now: NOW,
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    expect(sent.application.status).toBe("applied");
    expect(sent.outcome.decisionAtApplication).toBe("needs_info");
  });

  it("snapshot does not change after a new analysis merge", () => {
    const created = createApplicationFromJob({
      job: job(),
      decision: applyDecision,
      now: new Date("2026-09-12T16:53:30.919Z"),
    });
    const sent = transitionApplicationStatus({
      application: created.application,
      outcome: created.outcome,
      toStatus: "applied",
      now: NOW,
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    const afterLiveRescore = mergeOutcome(
      sent.outcome,
      {
        fitAtApplication: 60,
        decisionAtApplication: "needs_info",
        snapshot: {
          ...sent.outcome.snapshot!,
          overallFit: 60,
          decision: "needs_info",
          capturedAt: "2026-09-15T12:00:00.000Z",
        },
      },
      NOW,
    );
    expect(afterLiveRescore.snapshot?.overallFit).toBe(88);
    expect(afterLiveRescore.snapshot?.decision).toBe("apply_normal");
    expect(afterLiveRescore.fitAtApplication).toBe(88);
    expect(afterLiveRescore.decisionAtApplication).toBe("apply_normal");
  });

  it("Bluelight regression: snapshot 88 APPLY NORMAL coexists with current 60 INCONCLUSIVA", () => {
    const created = createApplicationFromJob({
      job: job("job_mtylpciv_5tq43jcc"),
      decision: applyDecision,
      now: new Date("2026-09-12T16:53:30.919Z"),
      applicationId: "app_mtymjjc7_job_mtylpciv_5tq43jcc",
    });
    const sent = transitionApplicationStatus({
      application: created.application,
      outcome: created.outcome,
      toStatus: "applied",
      now: new Date("2026-09-12T17:34:43.964Z"),
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    const atApply = analysisAtApplyFromOutcome(sent.outcome);
    const current = { score: 60, recommendation: "needs_info" as const };
    expect(atApply).toEqual({
      score: 88,
      recommendation: "apply_normal",
      analyzedAt: "2026-09-12T16:53:30.919Z",
    });
    expect(analysesDiverge(atApply, current)).toBe(true);
    expect(sent.application.status).toBe("applied");
    expect(sent.application.status === "applied" && atApply?.recommendation === "needs_info").toBe(false);
  });

  it("valid lifecycle transition works, updates lastActivityAt and writes an event", () => {
    const created = createApplicationFromJob({ job: job(), decision: applyDecision, now: NOW });
    const applied = transitionApplicationStatus({
      application: created.application,
      outcome: created.outcome,
      toStatus: "applied",
      now: NOW,
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const later = new Date("2026-09-16T10:00:00.000Z");
    const screening = transitionApplicationStatus({
      application: applied.application,
      outcome: applied.outcome,
      events: applied.events,
      toStatus: "screening",
      now: later,
    });
    expect(screening.ok).toBe(true);
    if (!screening.ok) return;
    expect(screening.application.status).toBe("interview");
    expect(screening.outcome.finalStatus).toBe("screening");
    expect(screening.outcome.lastActivityAt).toBe(later.toISOString());
    expect(screening.event?.type).toBe("screening");
    expect(screening.event?.fromStatus).toBe("applied");
    expect(screening.event?.toStatus).toBe("screening");
    expect(screening.events).toHaveLength(2);
  });

  it("invalid transition is rejected", () => {
    const created = createApplicationFromJob({ job: job(), decision: applyDecision, now: NOW });
    const applied = transitionApplicationStatus({
      application: created.application,
      outcome: created.outcome,
      toStatus: "applied",
      now: NOW,
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const hired = transitionApplicationStatus({
      application: applied.application,
      outcome: applied.outcome,
      events: applied.events,
      toStatus: "hired",
      now: NOW,
    });
    expect(hired.ok).toBe(false);
    if (hired.ok) return;
    expect(hired.error).toBe("invalid_transition");
    expect(canTransitionApplicationStatus("hired", "screening")).toBe(false);
    expect(APPLICATION_LIFECYCLE_TRANSITIONS.hired).toEqual([]);
  });

  it("repeated idempotent operation does not duplicate events", () => {
    const created = createApplicationFromJob({ job: job(), decision: applyDecision, now: NOW });
    const first = transitionApplicationStatus({
      application: created.application,
      outcome: created.outcome,
      toStatus: "applied",
      now: NOW,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = transitionApplicationStatus({
      application: first.application,
      outcome: first.outcome,
      events: first.events,
      toStatus: "applied",
      now: NOW,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.unchanged).toBe(true);
    expect(second.event).toBeNull();
    expect(second.events).toHaveLength(1);
    expect(markApplicationSubmitted(first.application, NOW)).toBe(first.application);
  });

  it("backfill of the four existing applications keeps snapshots and does not invent APPLY", () => {
    const fixtures: Array<{
      company: string;
      applicationId: string;
      jobId: string;
      fit: number;
      decision: JobDecisionV2["decision"];
      capturedAt: string;
      appliedAt: string;
    }> = [
      {
        company: "Tempo",
        applicationId: "app_mtxi0z2k_job_mtwa1mau_cu40gjkw",
        jobId: "job_mtwa1mau_cu40gjkw",
        fit: 82,
        decision: "apply_normal",
        capturedAt: "2026-09-11T21:59:20.204Z",
        appliedAt: "2026-09-11T22:45:39.533Z",
      },
      {
        company: "Bluelight Consulting",
        applicationId: "app_mtymjjc7_job_mtylpciv_5tq43jcc",
        jobId: "job_mtylpciv_5tq43jcc",
        fit: 88,
        decision: "apply_normal",
        capturedAt: "2026-09-12T16:53:30.919Z",
        appliedAt: "2026-09-12T17:34:43.964Z",
      },
      {
        company: "Sticker Mule",
        applicationId: "app_mu0a5we9_job_mtz2543g_ie12mwad",
        jobId: "job_mtz2543g_ie12mwad",
        fit: 65,
        decision: "needs_info",
        capturedAt: "2026-09-13T20:42:31.617Z",
        appliedAt: "2026-09-13T20:46:40.721Z",
      },
      {
        company: "WiTi",
        applicationId: "app_mu1fjkqn_job_mu0ygffs_36p8r3bb",
        jobId: "job_mu0ygffs_36p8r3bb",
        fit: 58,
        decision: "needs_info",
        capturedAt: "2026-09-14T16:00:53.951Z",
        appliedAt: "2026-09-15T03:04:24.620Z",
      },
    ];

    const applications: ApplyFlowApplication[] = fixtures.map((item) => ({
      id: item.applicationId,
      createdAt: item.capturedAt,
      updatedAt: item.appliedAt,
      source: "paste",
      status: "applied",
      companyName: item.company,
      fitScore: item.fit,
    }));
    const outcomes: ApplicationOutcome[] = fixtures.map((item) => ({
      applicationId: item.applicationId,
      createdAt: item.capturedAt,
      updatedAt: item.capturedAt,
      fitAtApplication: item.fit,
      decisionAtApplication: item.decision,
      snapshot: {
        capturedAt: item.capturedAt,
        overallFit: item.fit,
        dimensions: {
          overall: item.fit,
          coreEngineering: item.fit,
          stack: item.fit,
          specialization: item.fit,
          seniority: item.fit,
          product: item.fit,
        },
        decision: item.decision,
        priority: item.fit,
        requirements: [],
        supportingEvidenceIds: [],
        primaryCaseIds: [],
      },
    }));

    const first = backfillClosedLoopV1({ applications, outcomes, events: [], now: NOW });
    expect(first.changed).toBe(true);
    const second = backfillClosedLoopV1({
      applications,
      outcomes: first.outcomes,
      events: first.events,
      efforts: first.efforts,
      now: NOW,
    });
    expect(second.changed).toBe(false);

    for (const item of fixtures) {
      const outcome = first.outcomes.find((row) => row.applicationId === item.applicationId);
      expect(outcome?.appliedAt).toBe(item.appliedAt);
      expect(outcome?.snapshot?.overallFit).toBe(item.fit);
      expect(outcome?.snapshot?.decision).toBe(item.decision);
      expect(outcome?.finalStatus).toBe("applied");
      const view = getApplicationLifecycleView({
        application: applications.find((row) => row.id === item.applicationId)!,
        outcome,
        events: first.events,
      });
      expect(view.status).toBe("applied");
      expect(view.analysisAtApply?.score).toBe(item.fit);
      expect(view.analysisAtApply?.recommendation).toBe(item.decision);
      expect(view.events).toHaveLength(1);
      expect(view.events[0]?.source).toBe("backfill");
    }

    const sticker = first.outcomes.find((row) => row.applicationId === "app_mu0a5we9_job_mtz2543g_ie12mwad");
    const witi = first.outcomes.find((row) => row.applicationId === "app_mu1fjkqn_job_mu0ygffs_36p8r3bb");
    expect(sticker?.decisionAtApplication).toBe("needs_info");
    expect(witi?.appliedAt).toBe("2026-09-15T03:04:24.620Z");
    expect(formatLifecycleEventDate("2026-09-15T03:04:24.620Z")).toBe("15/09/2026");
  });

  it("exposes an explicit forward-only matrix", () => {
    const allowed = new Set<ApplyFlowPipelineStatusV2>(APPLICATION_LIFECYCLE_TRANSITIONS.applied);
    expect(allowed.has("screening")).toBe(true);
    expect(allowed.has("rejected")).toBe(true);
    expect(allowed.has("hired")).toBe(false);
    expect(allowed.has("applied")).toBe(false);
  });
});
