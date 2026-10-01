import { describe, expect, it, vi } from "vitest";

import type { ApplyFlowApplicationV2Envelope, ApplyFlowJob } from "@devflow/applyflow-core";
import { canTransitionApplicationStatus, fromPipelineStatusV2 } from "@devflow/applyflow-core";

import {
  cloudLifecycleFailureMessage,
  transitionCloudApplicationLifecycle,
} from "./cloud-application-transition";
import type { ApplyFlowDashboardPersistence } from "@/lib/persistence-v2/dashboard/dashboard-persistence";

const NOW = new Date("2026-10-01T12:00:00.000Z");

function application(overrides: Partial<ApplyFlowApplicationV2Envelope> = {}): ApplyFlowApplicationV2Envelope {
  return {
    id: "app-1",
    createdAt: "2026-09-20T12:00:00.000Z",
    updatedAt: "2026-09-20T12:00:00.000Z",
    source: "paste",
    status: "applied",
    jobTitle: "Engineer",
    companyName: "Acme",
    v2: { sourceJobId: "job-1" },
    ...overrides,
  };
}

function job(overrides: Partial<ApplyFlowJob> = {}): ApplyFlowJob {
  return {
    id: "job-1",
    title: "Engineer",
    company: "Acme",
    url: "https://example.com/jobs/1",
    source: "paste",
    status: "applied",
    jobContext: { skills: [] },
    jobMatch: {
      score: 70,
      decision: "apply",
      matchedSkills: [],
      missingSkills: [],
      evaluatedAt: NOW.toISOString(),
      scoringVersion: "v1",
    },
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

function persistenceMock(overrides: {
  updateApplication?: ApplyFlowDashboardPersistence["updateApplication"];
  updateJob?: ApplyFlowDashboardPersistence["updateJob"];
} = {}): ApplyFlowDashboardPersistence {
  return {
    mode: "v2",
    listJobs: async () => [],
    mergeJobs: async () => ({ ok: true, data: { jobs: [], added: 0, skipped: 0 } }),
    createJob: async () => ({ ok: false, code: "server" }),
    updateJob: overrides.updateJob ?? (async (item) => ({ ok: true, data: item })),
    listApplications: async () => [],
    createApplication: async () => ({ ok: false, code: "server" }),
    updateApplication:
      overrides.updateApplication ??
      (async (item) => ({
        ok: true,
        data: { ...item, updatedAt: NOW.toISOString() },
      })),
    replaceApplications: async () => ({ ok: false, code: "unsupported_in_v2" }),
  };
}

describe("transitionCloudApplicationLifecycle", () => {
  it("allows a canonical cloud transition and syncs linked job", async () => {
    const updateJob = vi.fn(async (item: ApplyFlowJob) => ({ ok: true as const, data: item }));
    const result = await transitionCloudApplicationLifecycle({
      persistence: persistenceMock({ updateJob }),
      application: application(),
      linkedJob: job(),
      toStatus: "screening",
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.application.status).toBe(fromPipelineStatusV2("screening"));
    expect(result.job?.status).toBe("interview");
    expect(updateJob).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid and terminal transitions before persistence", async () => {
    const updateApplication = vi.fn(async (item: ApplyFlowApplicationV2Envelope) => ({
      ok: true as const,
      data: item,
    }));
    const updateJob = vi.fn(async (item: ApplyFlowJob) => ({ ok: true as const, data: item }));
    const persistence = persistenceMock({ updateApplication, updateJob });

    const invalid = await transitionCloudApplicationLifecycle({
      persistence,
      application: application({ status: "hired" }),
      linkedJob: job({ status: "hired" }),
      toStatus: "screening",
    });
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.reason).toBe("invalid_transition");
    expect(canTransitionApplicationStatus("hired", "screening")).toBe(false);
    expect(updateApplication).not.toHaveBeenCalled();
    expect(updateJob).not.toHaveBeenCalled();

    const terminal = await transitionCloudApplicationLifecycle({
      persistence,
      application: application({ status: "rejected" }),
      toStatus: "applied",
    });
    expect(terminal.ok).toBe(false);
    if (!terminal.ok) expect(terminal.reason).toBe("invalid_transition");
  });

  it("same-status is unchanged without job rewrite", async () => {
    const updateApplication = vi.fn();
    const updateJob = vi.fn();
    const result = await transitionCloudApplicationLifecycle({
      persistence: persistenceMock({ updateApplication, updateJob }),
      application: application({ status: "applied" }),
      linkedJob: job({ status: "applied" }),
      toStatus: "applied",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.jobSynced).toBe(false);
    expect(updateApplication).not.toHaveBeenCalled();
    expect(updateJob).not.toHaveBeenCalled();
  });

  it("does not guess a linked job without sourceJobId match", async () => {
    const updateJob = vi.fn(async (item: ApplyFlowJob) => ({ ok: true as const, data: item }));
    const result = await transitionCloudApplicationLifecycle({
      persistence: persistenceMock({ updateJob }),
      application: application({ v2: {} }),
      linkedJob: job({ id: "unrelated" }),
      toStatus: "screening",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job).toBeNull();
    expect(result.jobSynced).toBe(false);
    expect(updateJob).not.toHaveBeenCalled();
  });

  it("surfaces application failure without touching the job", async () => {
    const updateJob = vi.fn();
    const result = await transitionCloudApplicationLifecycle({
      persistence: persistenceMock({
        updateApplication: async () => ({ ok: false, code: "version_conflict" }),
        updateJob,
      }),
      application: application(),
      linkedJob: job(),
      toStatus: "screening",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("application_update_failed");
    expect(updateJob).not.toHaveBeenCalled();
  });

  it("surfaces partial failure when job sync fails after application update", async () => {
    const result = await transitionCloudApplicationLifecycle({
      persistence: persistenceMock({
        updateApplication: async (item) => ({
          ok: true,
          data: { ...item, status: "interview", updatedAt: NOW.toISOString() },
        }),
        updateJob: async () => ({ ok: false, code: "network" }),
      }),
      application: application(),
      linkedJob: job(),
      toStatus: "screening",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("job_sync_incomplete");
    expect(result.application?.status).toBe("interview");
    expect(cloudLifecycleFailureMessage(result)).toMatch(/não sincronizou/i);
  });

  it("mark-sent applied path syncs job.applied", async () => {
    const result = await transitionCloudApplicationLifecycle({
      persistence: persistenceMock(),
      application: application({ status: "reviewing" }),
      linkedJob: job({ status: "reviewing" }),
      toStatus: "applied",
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.application.status).toBe("applied");
    expect(result.job?.status).toBe("applied");
  });

  it("syncs representative lifecycle job statuses", async () => {
    const cases = [
      ["technical", "technical_test"],
      ["offer", "accepted"],
      ["hired", "hired"],
      ["rejected", "rejected"],
    ] as const;
    for (const [toStatus, jobStatus] of cases) {
      const result = await transitionCloudApplicationLifecycle({
        persistence: persistenceMock(),
        application: application({
          status: toStatus === "hired" || toStatus === "rejected" ? "accepted" : "applied",
        }),
        linkedJob: job({
          status: toStatus === "hired" || toStatus === "rejected" ? "accepted" : "applied",
        }),
        toStatus,
        now: NOW,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.job?.status).toBe(jobStatus);
    }
  });
});
