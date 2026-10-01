import { describe, expect, it, vi } from "vitest";

import { createApplyFlowApplicationService } from "./application-service";
import { ApplyFlowApplicationServiceError } from "./application-errors";
import type {
  ApplyFlowApplication,
  ApplyFlowJob,
  ApplyFlowPersistenceDb,
  OptimisticUpdateResult,
} from "../repositories/types";
import type { ApplyFlowApplicationRepository } from "../repositories/applications-repository";
import type { ApplyFlowJobRepository } from "../repositories/jobs-repository";

function appRecord(overrides: Partial<ApplyFlowApplication> = {}): ApplyFlowApplication {
  return {
    accountId: "acc-a",
    id: "app-1",
    sourceJobId: "job-1",
    source: "paste",
    status: "applied",
    jobTitle: "Engineer",
    companyName: "Acme",
    jobUrl: "https://example.com/j",
    fitScore: 70,
    notes: null,
    jobMeta: null,
    v2Meta: null,
    extras: null,
    appliedAt: new Date("2026-09-01T00:00:00.000Z"),
    version: 1,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  } as ApplyFlowApplication;
}

function jobRecord(overrides: Partial<ApplyFlowJob> = {}): ApplyFlowJob {
  return {
    accountId: "acc-a",
    id: "job-1",
    title: "Engineer",
    company: "Acme",
    location: null,
    url: "https://example.com/j",
    canonicalUrl: "https://example.com/j",
    source: "paste",
    status: "applied",
    jobContext: { skills: [] },
    descriptionSnapshot: null,
    descriptionHash: null,
    jobMatch: {
      score: 70,
      decision: "apply",
      matchedSkills: [],
      missingSkills: [],
      evaluatedAt: "2026-09-01T00:00:00.000Z",
      scoringVersion: "v1",
    },
    evaluatedWith: null,
    curriculumRecommendation: null,
    applicationPack: null,
    version: 1,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  } as ApplyFlowJob;
}

function memoryLifecycleDb(seed: {
  application: ApplyFlowApplication;
  job?: ApplyFlowJob | null;
}): {
  db: ApplyFlowPersistenceDb;
  apps: ApplyFlowApplicationRepository;
  jobs: ApplyFlowJobRepository;
} {
  let application = { ...seed.application };
  let job = seed.job ? { ...seed.job } : null;

  const apps = {
    findById: vi.fn(async (accountId: string, id: string) =>
      application.accountId === accountId && application.id === id ? application : null,
    ),
    updateWithVersion: vi.fn(
      async (
        accountId: string,
        id: string,
        expectedVersion: number,
        patch: Record<string, unknown>,
      ): Promise<OptimisticUpdateResult<ApplyFlowApplication>> => {
        if (application.accountId !== accountId || application.id !== id) {
          return { ok: false, reason: "not_found" };
        }
        if (application.version !== expectedVersion) {
          return { ok: false, reason: "conflict" };
        }
        application = {
          ...application,
          ...patch,
          version: application.version + 1,
          updatedAt: new Date("2026-10-01T12:00:00.000Z"),
        } as ApplyFlowApplication;
        return { ok: true, record: application };
      },
    ),
  } as unknown as ApplyFlowApplicationRepository;

  const jobs = {
    findById: vi.fn(async (accountId: string, id: string) =>
      job && job.accountId === accountId && job.id === id ? job : null,
    ),
    updateWithVersion: vi.fn(
      async (
        accountId: string,
        id: string,
        expectedVersion: number,
        patch: Record<string, unknown>,
      ): Promise<OptimisticUpdateResult<ApplyFlowJob>> => {
        if (!job || job.accountId !== accountId || job.id !== id) {
          return { ok: false, reason: "not_found" };
        }
        if (job.version !== expectedVersion) {
          return { ok: false, reason: "conflict" };
        }
        job = {
          ...job,
          ...patch,
          version: job.version + 1,
          updatedAt: new Date("2026-10-01T12:00:00.000Z"),
        } as ApplyFlowJob;
        return { ok: true, record: job };
      },
    ),
  } as unknown as ApplyFlowJobRepository;

  // transitionLifecycle creates fresh repos from tx — wire factory via $transaction callback using same in-memory state.
  const db = {
    $transaction: async <T>(fn: (tx: ApplyFlowPersistenceDb) => Promise<T>) => {
      // Provide delegate-shaped tx that repository factories expect.
      const tx = {
        applyFlowApplication: {
          findUnique: async ({ where }: { where: { accountId_id: { accountId: string; id: string } } }) => {
            const { accountId, id } = where.accountId_id;
            return application.accountId === accountId && application.id === id ? application : null;
          },
          updateMany: async ({
            where,
            data,
          }: {
            where: { accountId: string; id: string; version: number };
            data: Record<string, unknown>;
          }) => {
            if (
              application.accountId !== where.accountId ||
              application.id !== where.id ||
              application.version !== where.version
            ) {
              return { count: 0 };
            }
            const nextData = { ...data };
            if (
              nextData.version &&
              typeof nextData.version === "object" &&
              "increment" in (nextData.version as object)
            ) {
              delete nextData.version;
            }
            application = {
              ...application,
              ...nextData,
              version: application.version + 1,
              updatedAt: new Date("2026-10-01T12:00:00.000Z"),
            } as ApplyFlowApplication;
            return { count: 1 };
          },
        },
        applyFlowJob: {
          findUnique: async ({ where }: { where: { accountId_id: { accountId: string; id: string } } }) => {
            if (!job) return null;
            const { accountId, id } = where.accountId_id;
            return job.accountId === accountId && job.id === id ? job : null;
          },
          updateMany: async ({
            where,
            data,
          }: {
            where: { accountId: string; id: string; version: number };
            data: Record<string, unknown>;
          }) => {
            if (
              !job ||
              job.accountId !== where.accountId ||
              job.id !== where.id ||
              job.version !== where.version
            ) {
              return { count: 0 };
            }
            const nextData = { ...data };
            if (
              nextData.version &&
              typeof nextData.version === "object" &&
              "increment" in (nextData.version as object)
            ) {
              delete nextData.version;
            }
            job = {
              ...job,
              ...nextData,
              version: job.version + 1,
              updatedAt: new Date("2026-10-01T12:00:00.000Z"),
            } as ApplyFlowJob;
            return { count: 1 };
          },
        },
      } as unknown as ApplyFlowPersistenceDb;
      return fn(tx);
    },
  } as ApplyFlowPersistenceDb;

  return { db, apps, jobs };
}

describe("application transitionLifecycle (atomic App↔Job)", () => {
  it("updates Application and linked Job together", async () => {
    const { db, apps, jobs } = memoryLifecycleDb({
      application: appRecord(),
      job: jobRecord(),
    });
    const service = createApplyFlowApplicationService(apps, jobs, db);
    const result = await service.transitionLifecycle("acc-a", "app-1", 1, { status: "interview" });
    expect(result.application.status).toBe("interview");
    expect(result.job?.status).toBe("interview");
    expect(result.jobSynced).toBe(true);
  });

  it("maps applied/screening/technical/offer/hired/rejected onto linked Job", async () => {
    const cases: Array<{ from: string; to: string }> = [
      { from: "reviewing", to: "applied" },
      { from: "applied", to: "interview" },
      { from: "interview", to: "technical_test" },
      { from: "technical_test", to: "accepted" },
      { from: "accepted", to: "hired" },
      { from: "applied", to: "rejected" },
    ];

    for (const { from, to } of cases) {
      const { db, apps, jobs } = memoryLifecycleDb({
        application: appRecord({ status: from, version: 1 }),
        job: jobRecord({ status: from, version: 1 }),
      });
      const service = createApplyFlowApplicationService(apps, jobs, db);
      const result = await service.transitionLifecycle("acc-a", "app-1", 1, {
        status: to as "applied",
      });
      expect(result.application.status).toBe(to);
      expect(result.job?.status).toBe(to);
    }
  });

  it("does not mutate wrong-tenant Job (missing under account scope)", async () => {
    const { db, apps, jobs } = memoryLifecycleDb({
      application: appRecord({ sourceJobId: "job-foreign" }),
      job: null,
    });
    const service = createApplyFlowApplicationService(apps, jobs, db);
    const result = await service.transitionLifecycle("acc-a", "app-1", 1, { status: "interview" });
    expect(result.application.status).toBe("interview");
    expect(result.job).toBeNull();
    expect(result.jobSynced).toBe(false);
  });

  it("rejects stale expectedVersion (OCC)", async () => {
    const { db, apps, jobs } = memoryLifecycleDb({
      application: appRecord({ version: 2 }),
      job: jobRecord({ version: 2 }),
    });
    const service = createApplyFlowApplicationService(apps, jobs, db);
    await expect(
      service.transitionLifecycle("acc-a", "app-1", 1, { status: "interview" }),
    ).rejects.toBeInstanceOf(ApplyFlowApplicationServiceError);
  });

  it("allows concurrent loser to fail with version_conflict semantics", async () => {
    const { db, apps, jobs } = memoryLifecycleDb({
      application: appRecord({ status: "applied", version: 1 }),
      job: jobRecord({ status: "applied", version: 1 }),
    });
    const service = createApplyFlowApplicationService(apps, jobs, db);
    const winner = await service.transitionLifecycle("acc-a", "app-1", 1, { status: "interview" });
    expect(winner.application.status).toBe("interview");
    await expect(
      service.transitionLifecycle("acc-a", "app-1", 1, { status: "rejected" }),
    ).rejects.toMatchObject({ code: "version_conflict" });
  });
});
