import { describe, expect, it } from "vitest";

import { createApplicationFromJob } from "../application-identity.js";
import { markApplyFlowJobApplied } from "../application-pack.js";
import type { JobDecisionV2 } from "../application-decision-types.js";
import {
  displayDerivedApplicationId,
  isDisplayDerivedFromAppliedJob,
  listDashboardApplicationsForDisplay,
} from "../applications-display-list.js";
import { getApplicationsByPeriod } from "../application-metrics.js";
import type { ApplyFlowApplicationV2Envelope } from "../application-record-v2.js";
import type { ApplyFlowJob } from "../job-match-types.js";

const NOW = new Date("2026-11-17T15:00:00.000Z");

const decision: JobDecisionV2 = {
  scoringVersion: "v2",
  decision: "apply_normal",
  overall: 71,
  dimensions: {
    overall: 71,
    coreEngineering: 71,
    stack: 100,
    specialization: 100,
    seniority: 40,
    product: 100,
  },
  confidence: "medium",
  hiringProbability: "medium",
  careerUpside: "medium",
  applicationCost: "medium",
  opportunityCost: "low",
  eliminationRisk: "low",
  priority: 70,
  matches: [],
  claims: [],
  recommendedClaims: [],
  gates: [],
  candidateInputRequests: [],
  reasons: ["fixture"],
};

function job(overrides: Partial<ApplyFlowJob> & Pick<ApplyFlowJob, "id">): ApplyFlowJob {
  return {
    id: overrides.id,
    title: overrides.title ?? "Senior Software Engineer LATAM",
    company: overrides.company ?? "Wagmo",
    url: overrides.url ?? `https://remoteok.com/remote-jobs/${overrides.id}`,
    source: overrides.source ?? "remoteok",
    status: overrides.status ?? "applied",
    jobContext: overrides.jobContext ?? {
      skills: ["react", "python"],
      workModel: "remote",
      officialApplyUrl: "https://jobs.example/wagmo/apply",
    },
    jobMatch: overrides.jobMatch ?? {
      score: 71,
      decision: "apply",
      matchedSkills: ["react", "python"],
      missingSkills: [],
      evaluatedAt: NOW.toISOString(),
      scoringVersion: "v1",
    },
    createdAt: overrides.createdAt ?? "2026-10-01T12:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-11-01T12:00:00.000Z",
    applicationPack: overrides.applicationPack,
  };
}

describe("listDashboardApplicationsForDisplay", () => {
  it("shows an applied job without Application once, without inventing appliedAt", () => {
    const applied = job({ id: "job_ro_1137572" });
    const list = listDashboardApplicationsForDisplay([], [applied]);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(displayDerivedApplicationId("job_ro_1137572"));
    expect(list[0]?.status).toBe("applied");
    expect(list[0]?.appliedAt).toBeUndefined();
    expect(list[0]?.createdAt).toBe("");
    expect(list[0]?.jobUrl).toBe("https://jobs.example/wagmo/apply");
    expect(list[0]?.v2?.sourceJobId).toBe("job_ro_1137572");
    expect(isDisplayDerivedFromAppliedJob(list[0]!)).toBe(true);
  });

  it("does not duplicate when Application and applied job both exist", () => {
    const applied = job({ id: "job_ro_1137572" });
    const created = createApplicationFromJob({ job: { ...applied, status: "reviewing" }, decision, now: NOW });
    const persisted: ApplyFlowApplicationV2Envelope = {
      ...created.application,
      status: "applied",
      appliedAt: "2026-11-10T18:00:00.000Z",
    };
    const list = listDashboardApplicationsForDisplay([persisted], [applied]);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(persisted.id);
    expect(list[0]?.appliedAt).toBe("2026-11-10T18:00:00.000Z");
    expect(isDisplayDerivedFromAppliedJob(list[0]!)).toBe(false);
  });

  it("keeps reviewing jobs out of the Candidaturas display merge", () => {
    const reviewing = job({ id: "job_mwfici36_z7n3et9k", status: "reviewing", company: "Stefanini" });
    const list = listDashboardApplicationsForDisplay([], [reviewing]);
    expect(list).toHaveLength(0);
  });

  it("preserves multiple distinct Applications without a shared source job", () => {
    const first = createApplicationFromJob({
      job: job({ id: "job_a", status: "reviewing", url: "https://jobs.example/a" }),
      decision,
      now: NOW,
    }).application;
    const second = createApplicationFromJob({
      job: job({ id: "job_b", status: "reviewing", url: "https://jobs.example/b", company: "Other" }),
      decision,
      now: new Date(NOW.getTime() + 1000),
    }).application;
    const list = listDashboardApplicationsForDisplay(
      [
        { ...first, status: "applied" },
        { ...second, status: "interview" },
      ],
      [],
    );
    expect(list).toHaveLength(2);
    expect(new Set(list.map((item) => item.id)).size).toBe(2);
  });

  it("keeps derived applied rows visible under period filters without a createdAt", () => {
    const derived = listDashboardApplicationsForDisplay([], [job({ id: "job_legacy" })])[0]!;
    const inPeriod = getApplicationsByPeriod([derived], "7d", NOW);
    expect(inPeriod).toHaveLength(1);
    expect(inPeriod[0]?.id).toBe(derived.id);
  });

  it("Sim, enviei then reload: reviewing job appears once in Candidaturas without Application write", () => {
    const reviewing = job({
      id: "job_sim_enviei",
      status: "reviewing",
      company: "Local Harness",
      title: "Synthetic Engineer",
    });
    expect(listDashboardApplicationsForDisplay([], [reviewing])).toHaveLength(0);

    const applied = markApplyFlowJobApplied(reviewing, NOW);
    expect(applied.status).toBe("applied");
    expect(applied.updatedAt).toBe(NOW.toISOString());

    const afterConfirm = listDashboardApplicationsForDisplay([], [applied]);
    expect(afterConfirm).toHaveLength(1);
    expect(afterConfirm[0]?.companyName).toBe("Local Harness");
    expect(afterConfirm[0]?.appliedAt).toBeUndefined();
    expect(afterConfirm[0]?.createdAt).toBe("");
    expect(isDisplayDerivedFromAppliedJob(afterConfirm[0]!)).toBe(true);

    // Reload: same persisted jobs[] + empty applications[] → still one row, no duplicate.
    const afterReload = listDashboardApplicationsForDisplay([], [applied]);
    expect(afterReload).toHaveLength(1);
    expect(afterReload[0]?.id).toBe(afterConfirm[0]?.id);
  });

  it("mixed fixture: applied-without-app, applied-with-app, reviewing portal-only", () => {
    const wagmo = job({ id: "job_ro_1137572", company: "Wagmo", status: "applied" });
    const stefanini = job({
      id: "job_mwfici36_z7n3et9k",
      company: "Stefanini Brasil",
      status: "reviewing",
      url: "https://example.com/stefanini",
    });
    const oowlishJob = job({
      id: "job_oowlish",
      company: "Oowlish",
      status: "applied",
      url: "https://example.com/oowlish",
    });
    const oowlishApp: ApplyFlowApplicationV2Envelope = {
      ...createApplicationFromJob({
        job: { ...oowlishJob, status: "reviewing" },
        decision,
        now: NOW,
      }).application,
      status: "applied",
      appliedAt: "2026-11-10T18:00:00.000Z",
    };

    const list = listDashboardApplicationsForDisplay([oowlishApp], [wagmo, stefanini, oowlishJob]);
    expect(list.map((row) => row.companyName).sort()).toEqual(["Oowlish", "Wagmo"]);
    expect(list.filter((row) => row.companyName === "Wagmo")).toHaveLength(1);
    expect(list.filter((row) => row.companyName === "Oowlish")).toHaveLength(1);
    expect(list.find((row) => row.companyName === "Oowlish")?.appliedAt).toBe("2026-11-10T18:00:00.000Z");
    expect(list.find((row) => row.companyName === "Wagmo")?.appliedAt).toBeUndefined();
  });
});
