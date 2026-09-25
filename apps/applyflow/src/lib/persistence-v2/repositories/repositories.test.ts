import { describe, expect, it } from "vitest";

import { createApplyFlowApplicationRepository } from "./applications-repository";
import { createApplyFlowJobRepository } from "./jobs-repository";
import { createApplyFlowMigrationSessionRepository } from "./migration-session-repository";
import type {
  ApplyFlowApplication,
  ApplyFlowJob,
  ApplyFlowMigrationSession,
  ApplyFlowPersistenceDb,
} from "./types";

function key(accountId: string, id: string): string {
  return `${accountId}::${id}`;
}

function createMemoryDb(): ApplyFlowPersistenceDb {
  const jobs = new Map<string, ApplyFlowJob>();
  const applications = new Map<string, ApplyFlowApplication>();

  const jobDelegate = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const record = {
        ...data,
        version: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      } as ApplyFlowJob;
      jobs.set(key(record.accountId, record.id), record);
      return record;
    },
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { accountId_id: { accountId: string; id: string } };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      const k = key(where.accountId_id.accountId, where.accountId_id.id);
      const existing = jobs.get(k);
      if (!existing) {
        return jobDelegate.create({ data: create });
      }
      const next = {
        ...existing,
        ...update,
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      } as ApplyFlowJob;
      jobs.set(k, next);
      return next;
    },
    findUnique: async ({ where }: { where: { accountId_id: { accountId: string; id: string } } }) => {
      return jobs.get(key(where.accountId_id.accountId, where.accountId_id.id)) ?? null;
    },
    findMany: async ({ where }: { where: Record<string, unknown> }) => {
      return [...jobs.values()].filter((job) => {
        if (where.accountId && job.accountId !== where.accountId) return false;
        if ("canonicalUrl" in where && job.canonicalUrl !== where.canonicalUrl) return false;
        if ("descriptionHash" in where && job.descriptionHash !== where.descriptionHash) return false;
        return true;
      });
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { accountId: string; id: string; version: number };
      data: Record<string, unknown> & { version?: { increment: number } };
    }) => {
      const k = key(where.accountId, where.id);
      const existing = jobs.get(k);
      if (!existing || existing.version !== where.version) {
        return { count: 0 };
      }
      const { version, ...rest } = data;
      const next = {
        ...existing,
        ...rest,
        version: version?.increment ? existing.version + version.increment : existing.version,
        updatedAt: new Date("2026-01-03T00:00:00.000Z"),
      } as ApplyFlowJob;
      jobs.set(k, next);
      return { count: 1 };
    },
    delete: async ({ where }: { where: { accountId_id: { accountId: string; id: string } } }) => {
      const k = key(where.accountId_id.accountId, where.accountId_id.id);
      const existing = jobs.get(k);
      if (!existing) throw new Error("not found");
      jobs.delete(k);
      return existing;
    },
  };

  const applicationDelegate = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const record = {
        ...data,
        version: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      } as ApplyFlowApplication;
      applications.set(key(record.accountId, record.id), record);
      return record;
    },
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { accountId_id: { accountId: string; id: string } };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      const k = key(where.accountId_id.accountId, where.accountId_id.id);
      const existing = applications.get(k);
      if (!existing) {
        return applicationDelegate.create({ data: create });
      }
      const next = {
        ...existing,
        ...update,
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      } as ApplyFlowApplication;
      applications.set(k, next);
      return next;
    },
    findUnique: async ({ where }: { where: { accountId_id: { accountId: string; id: string } } }) => {
      return applications.get(key(where.accountId_id.accountId, where.accountId_id.id)) ?? null;
    },
    findMany: async ({ where }: { where: Record<string, unknown> }) => {
      return [...applications.values()]
        .filter((app) => {
          if (where.accountId && app.accountId !== where.accountId) return false;
          if ("sourceJobId" in where && app.sourceJobId !== where.sourceJobId) return false;
          return true;
        })
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { accountId: string; id?: string; version?: number; sourceJobId?: string };
      data: Record<string, unknown> & { version?: { increment: number } };
    }) => {
      let count = 0;
      for (const [k, existing] of applications) {
        if (existing.accountId !== where.accountId) continue;
        if (where.id !== undefined && existing.id !== where.id) continue;
        if (where.version !== undefined && existing.version !== where.version) continue;
        if (where.sourceJobId !== undefined && existing.sourceJobId !== where.sourceJobId) continue;
        const { version, ...rest } = data;
        const next = {
          ...existing,
          ...rest,
          version: version?.increment ? existing.version + version.increment : existing.version,
          updatedAt: new Date("2026-01-03T00:00:00.000Z"),
        } as ApplyFlowApplication;
        applications.set(k, next);
        count += 1;
      }
      return { count };
    },
  };

  const sessions = new Map<string, ApplyFlowMigrationSession>();
  let sessionSeq = 0;

  const migrationSessionDelegate = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const fingerprintKey = `${data.accountId}::${data.sourceVersion}::${data.bundleFingerprint}`;
      for (const existing of sessions.values()) {
        if (
          existing.accountId === data.accountId &&
          existing.sourceVersion === data.sourceVersion &&
          existing.bundleFingerprint === data.bundleFingerprint
        ) {
          const err = Object.assign(new Error("unique"), { code: "P2002" });
          throw err;
        }
      }
      const id = `session-${++sessionSeq}`;
      const record = {
        id,
        ...data,
        processedJobs: data.processedJobs ?? 0,
        processedApplications: data.processedApplications ?? 0,
        conflictSummary: data.conflictSummary ?? null,
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        completedAt: null,
      } as ApplyFlowMigrationSession;
      sessions.set(id, record);
      void fingerprintKey;
      return record;
    },
    findUnique: async ({
      where,
    }: {
      where:
        | { id: string }
        | {
            accountId_sourceVersion_bundleFingerprint: {
              accountId: string;
              sourceVersion: number;
              bundleFingerprint: string;
            };
          };
    }) => {
      if ("id" in where) {
        return sessions.get(where.id) ?? null;
      }
      const keyParts = where.accountId_sourceVersion_bundleFingerprint;
      return (
        [...sessions.values()].find(
          (row) =>
            row.accountId === keyParts.accountId &&
            row.sourceVersion === keyParts.sourceVersion &&
            row.bundleFingerprint === keyParts.bundleFingerprint,
        ) ?? null
      );
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const existing = sessions.get(where.id);
      if (!existing) throw new Error("not found");
      const next = {
        ...existing,
        ...data,
        updatedAt: new Date("2026-01-03T00:00:00.000Z"),
      } as ApplyFlowMigrationSession;
      sessions.set(where.id, next);
      return next;
    },
  };

  const db = {
    applyFlowJob: jobDelegate,
    applyFlowApplication: applicationDelegate,
    applyFlowMigrationSession: migrationSessionDelegate,
    $transaction: async <T>(
      fn: (tx: {
        applyFlowJob: typeof jobDelegate;
        applyFlowApplication: typeof applicationDelegate;
        applyFlowMigrationSession: typeof migrationSessionDelegate;
      }) => Promise<T>,
    ) =>
      fn({
        applyFlowJob: jobDelegate,
        applyFlowApplication: applicationDelegate,
        applyFlowMigrationSession: migrationSessionDelegate,
      }),
  };

  return db as unknown as ApplyFlowPersistenceDb;
}

const emptyJobContext = { skills: [] as string[] };
const emptyJobMatch = {
  score: 50,
  decision: "apply",
  matchedSkills: [],
  missingSkills: [],
  evaluatedAt: "2026-01-01T00:00:00.000Z",
  scoringVersion: "v1",
};

describe("ApplyFlow job/application repositories", () => {
  it("scopes Job identity by account — same id can exist under two accounts", async () => {
    const db = createMemoryDb();
    const jobs = createApplyFlowJobRepository(db);

    await jobs.create({
      accountId: "11111111-1111-1111-1111-111111111111",
      id: "job_shared",
      title: "A",
      source: "paste",
      status: "reviewing",
      jobContext: emptyJobContext,
      jobMatch: emptyJobMatch,
    });
    await jobs.create({
      accountId: "22222222-2222-2222-2222-222222222222",
      id: "job_shared",
      title: "B",
      source: "paste",
      status: "reviewing",
      jobContext: emptyJobContext,
      jobMatch: emptyJobMatch,
    });

    const a = await jobs.findById("11111111-1111-1111-1111-111111111111", "job_shared");
    const b = await jobs.findById("22222222-2222-2222-2222-222222222222", "job_shared");
    expect(a?.title).toBe("A");
    expect(b?.title).toBe("B");
    expect(await jobs.findById("11111111-1111-1111-1111-111111111111", "missing")).toBeNull();
  });

  it("prevents cross-account Job read/update", async () => {
    const db = createMemoryDb();
    const jobs = createApplyFlowJobRepository(db);
    const accountA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const accountB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

    await jobs.create({
      accountId: accountA,
      id: "job_mtylpciv_5tq43jcc",
      title: "Owned by A",
      source: "linkedin",
      status: "reviewing",
      jobContext: emptyJobContext,
      jobMatch: emptyJobMatch,
    });

    expect(await jobs.findById(accountB, "job_mtylpciv_5tq43jcc")).toBeNull();
    const conflict = await jobs.updateWithVersion(accountB, "job_mtylpciv_5tq43jcc", 1, {
      title: "Hijack",
    });
    expect(conflict).toEqual({ ok: false, reason: "not_found" });
    expect((await jobs.findById(accountA, "job_mtylpciv_5tq43jcc"))?.title).toBe("Owned by A");
  });

  it("scopes Application identity and blocks cross-account access", async () => {
    const db = createMemoryDb();
    const apps = createApplyFlowApplicationRepository(db);
    const accountA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const accountB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

    await apps.create({
      accountId: accountA,
      id: "app_mtylpciv_job_1",
      source: "paste",
      status: "reviewing",
      sourceJobId: "job_1",
    });
    await apps.create({
      accountId: accountB,
      id: "app_mtylpciv_job_1",
      source: "paste",
      status: "applied",
    });

    expect((await apps.findById(accountA, "app_mtylpciv_job_1"))?.status).toBe("reviewing");
    expect((await apps.findById(accountB, "app_mtylpciv_job_1"))?.status).toBe("applied");
    expect(await apps.updateWithVersion(accountB, "app_mtylpciv_job_1", 1, { notes: "x" })).toMatchObject({
      ok: true,
    });
    expect(await apps.findById(accountA, "app_mtylpciv_job_1")).toMatchObject({ notes: null });
  });

  it("increments version on successful optimistic update and conflicts on stale version", async () => {
    const db = createMemoryDb();
    const jobs = createApplyFlowJobRepository(db);
    const accountId = "cccccccc-cccc-cccc-cccc-cccccccccccc";

    await jobs.create({
      accountId,
      id: "job_opt",
      title: "v1",
      source: "json",
      status: "reviewing",
      jobContext: emptyJobContext,
      jobMatch: emptyJobMatch,
    });

    const ok = await jobs.updateWithVersion(accountId, "job_opt", 1, { title: "v2" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.record.version).toBe(2);

    const stale = await jobs.updateWithVersion(accountId, "job_opt", 1, { title: "stale" });
    expect(stale).toEqual({ ok: false, reason: "conflict" });
    expect((await jobs.findById(accountId, "job_opt"))?.title).toBe("v2");
  });

  it("supports Application optimistic concurrency", async () => {
    const db = createMemoryDb();
    const apps = createApplyFlowApplicationRepository(db);
    const accountId = "dddddddd-dddd-dddd-dddd-dddddddddddd";

    await apps.create({
      accountId,
      id: "550e8400-e29b-41d4-a716-446655440000",
      source: "linkedin",
      status: "reviewing",
    });

    const ok = await apps.updateWithVersion(accountId, "550e8400-e29b-41d4-a716-446655440000", 1, {
      status: "applied",
      appliedAt: new Date("2026-02-01T00:00:00.000Z"),
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.record.version).toBe(2);

    const stale = await apps.updateWithVersion(accountId, "550e8400-e29b-41d4-a716-446655440000", 1, {
      status: "rejected",
    });
    expect(stale).toEqual({ ok: false, reason: "conflict" });
  });

  it("allows 0..N Applications for the same sourceJobId and null sourceJobId", async () => {
    const db = createMemoryDb();
    const apps = createApplyFlowApplicationRepository(db);
    const accountId = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

    await apps.create({
      accountId,
      id: "app_one_job_x",
      source: "paste",
      status: "reviewing",
      sourceJobId: "job_x",
    });
    await apps.create({
      accountId,
      id: "app_two_job_x",
      source: "paste",
      status: "applied",
      sourceJobId: "job_x",
    });
    await apps.create({
      accountId,
      id: "app_orphan",
      source: "paste",
      status: "reviewing",
      sourceJobId: null,
    });

    const linked = await apps.findBySourceJobId(accountId, "job_x");
    expect(linked.map((item) => item.id)).toEqual(["app_one_job_x", "app_two_job_x"]);
    expect((await apps.findById(accountId, "app_orphan"))?.sourceJobId).toBeNull();
  });

  it("on Job delete, Applications survive and sourceJobId becomes null", async () => {
    const db = createMemoryDb();
    const jobs = createApplyFlowJobRepository(db);
    const apps = createApplyFlowApplicationRepository(db);
    const accountId = "ffffffff-ffff-ffff-ffff-ffffffffffff";

    await jobs.create({
      accountId,
      id: "job_to_delete",
      title: "Temp",
      source: "paste",
      status: "reviewing",
      jobContext: emptyJobContext,
      jobMatch: emptyJobMatch,
    });
    await apps.create({
      accountId,
      id: "app_keep",
      source: "paste",
      status: "reviewing",
      sourceJobId: "job_to_delete",
    });

    const result = await jobs.deleteById(accountId, "job_to_delete");
    expect(result).toEqual({ deleted: true, unlinkedApplications: 1 });
    expect(await jobs.findById(accountId, "job_to_delete")).toBeNull();
    const kept = await apps.findById(accountId, "app_keep");
    expect(kept?.sourceJobId).toBeNull();
    expect(kept?.accountId).toBe(accountId);
  });

  it("accepts V1 job_ / app_ ids and extension UUID Application ids", async () => {
    const db = createMemoryDb();
    const jobs = createApplyFlowJobRepository(db);
    const apps = createApplyFlowApplicationRepository(db);
    const accountId = "99999999-9999-9999-9999-999999999999";

    await jobs.create({
      accountId,
      id: "job_mtylpciv_5tq43jcc",
      title: "V1 style",
      source: "paste",
      status: "reviewing",
      jobContext: emptyJobContext,
      jobMatch: emptyJobMatch,
      canonicalUrl: "https://jobs.example.com/role",
      descriptionHash: "deadbeef",
    });
    await apps.create({
      accountId,
      id: "app_mtylpciv_job_mtylpciv_5tq43jcc",
      source: "paste",
      status: "reviewing",
      sourceJobId: "job_mtylpciv_5tq43jcc",
    });
    await apps.create({
      accountId,
      id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      source: "linkedin",
      status: "ignored",
    });

    expect(await jobs.findByCanonicalUrl(accountId, "https://jobs.example.com/role")).toHaveLength(1);
    expect(await jobs.findByDescriptionHash(accountId, "deadbeef")).toHaveLength(1);
    expect(await apps.findById(accountId, "6ba7b810-9dad-11d1-80b4-00c04fd430c8")).not.toBeNull();
  });

  it("requires explicit accountId", async () => {
    const db = createMemoryDb();
    const jobs = createApplyFlowJobRepository(db);
    await expect(
      jobs.create({
        accountId: "",
        id: "job_x",
        title: "x",
        source: "paste",
        status: "reviewing",
        jobContext: emptyJobContext,
        jobMatch: emptyJobMatch,
      }),
    ).rejects.toThrow(/accountId is required/);
  });
});

describe("ApplyFlow migration session repository", () => {
  it("creates, finds by fingerprint, updates state, and isolates accounts", async () => {
    const db = createMemoryDb();
    const sessions = createApplyFlowMigrationSessionRepository(db);
    const accountA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const accountB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

    const created = await sessions.create({
      accountId: accountA,
      sourceVersion: 1,
      bundleFingerprint: "fp-1",
      status: "pending",
      expectedJobs: 1,
      expectedApplications: 0,
    });
    expect(created.status).toBe("pending");

    const found = await sessions.findByFingerprint(accountA, 1, "fp-1");
    expect(found?.id).toBe(created.id);
    expect(await sessions.findByFingerprint(accountB, 1, "fp-1")).toBeNull();
    expect(await sessions.findById(accountB, created.id)).toBeNull();

    const importing = await sessions.update(accountA, created.id, { status: "importing" });
    expect(importing?.status).toBe("importing");

    const completed = await sessions.update(accountA, created.id, {
      status: "completed",
      processedJobs: 1,
      completedAt: new Date("2026-09-25T20:00:00.000Z"),
    });
    expect(completed?.status).toBe("completed");
    expect(completed?.completedAt?.toISOString()).toBe("2026-09-25T20:00:00.000Z");

    await expect(
      sessions.create({
        accountId: accountA,
        sourceVersion: 1,
        bundleFingerprint: "fp-1",
        status: "pending",
        expectedJobs: 1,
        expectedApplications: 0,
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
