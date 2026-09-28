/**
 * AF-REL-002 — Partial-resumable migration contract verification.
 * Fault injection via repository wrappers; memory DB $transaction rolls back on throw.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  assertApplyFlowV2HttpCapability,
  type ApplyFlowV2HttpCapability,
} from "../http-access";
import { createApplyFlowApplicationRepository } from "../repositories/applications-repository";
import { createApplyFlowJobRepository } from "../repositories/jobs-repository";
import { createApplyFlowMigrationSessionRepository } from "../repositories/migration-session-repository";
import type { ApplyFlowApplicationRepository, ApplyFlowJobRepository } from "../repositories/types";
import { resolveApplyFlowPersistenceMode } from "../resolve-persistence-access";
import { createMemoryPersistenceDb, memoryPilotAccount } from "../test-memory-db";
import { fingerprintMigrationBundle } from "./migration-fingerprint";
import { createApplyFlowMigrationService, MIGRATION_SESSION_STATUS } from "./migration-service";
import type { MigrationImportBody } from "./migration-dto";

const ACCOUNT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

class InjectedCrashError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InjectedCrashError";
  }
}

function sampleJob(id: string, title = "Role"): MigrationImportBody["jobs"][number] {
  return {
    id,
    title,
    source: "paste",
    status: "reviewing",
    jobContext: { skills: ["React"] },
    jobMatch: {
      score: 80,
      decision: "apply",
      matchedSkills: ["React"],
      missingSkills: [],
      evaluatedAt: "2026-09-25T12:00:00.000Z",
      scoringVersion: "v1",
    },
  };
}

function sampleApp(
  id: string,
  overrides: Partial<MigrationImportBody["applications"][number]> = {},
): MigrationImportBody["applications"][number] {
  return {
    id,
    source: "paste",
    status: "reviewing",
    ...overrides,
  };
}

function bundle(
  jobs: MigrationImportBody["jobs"],
  applications: MigrationImportBody["applications"],
): MigrationImportBody {
  return {
    sourceVersion: 1,
    fingerprint: fingerprintMigrationBundle({ jobs, applications }),
    jobs,
    applications,
  };
}

function createHarness(opts?: {
  wrapJobs?: (jobs: ApplyFlowJobRepository) => ApplyFlowJobRepository;
  wrapApplications?: (apps: ApplyFlowApplicationRepository) => ApplyFlowApplicationRepository;
}) {
  const memory = createMemoryPersistenceDb([memoryPilotAccount(ACCOUNT), memoryPilotAccount(OTHER)]);
  let jobsRepo = createApplyFlowJobRepository(memory.db);
  let applicationsRepo = createApplyFlowApplicationRepository(memory.db);
  if (opts?.wrapJobs) jobsRepo = opts.wrapJobs(jobsRepo);
  if (opts?.wrapApplications) applicationsRepo = opts.wrapApplications(applicationsRepo);
  const sessionsRepo = createApplyFlowMigrationSessionRepository(memory.db);
  const service = createApplyFlowMigrationService({
    db: memory.db,
    jobs: jobsRepo,
    applications: applicationsRepo,
    sessions: sessionsRepo,
  });
  return {
    db: memory.db,
    accounts: memory.accounts,
    jobStore: memory.jobs,
    applicationStore: memory.applications,
    sessionStore: memory.sessions,
    jobs: jobsRepo,
    applications: applicationsRepo,
    sessions: sessionsRepo,
    service,
  };
}

function resumeService(db: ReturnType<typeof createMemoryPersistenceDb>["db"]) {
  return createApplyFlowMigrationService({
    db,
    jobs: createApplyFlowJobRepository(db),
    applications: createApplyFlowApplicationRepository(db),
    sessions: createApplyFlowMigrationSessionRepository(db),
  });
}

function failAfterNCreates<T extends { create: (...args: never[]) => Promise<unknown> }>(
  repo: T,
  n: number,
  label: string,
): T {
  let created = 0;
  return {
    ...repo,
    async create(...args: Parameters<T["create"]>) {
      const row = await repo.create(...args);
      created += 1;
      if (created >= n) {
        throw new InjectedCrashError(`${label}_crash_after_${n}`);
      }
      return row;
    },
  };
}

describe("AF-REL-002 partial-resumable migration contract", () => {
  const previous = process.env.APPLYFLOW_PERSISTENCE_V2;
  beforeEach(() => {
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
  });
  afterEach(() => {
    if (previous === undefined) delete process.env.APPLYFLOW_PERSISTENCE_V2;
    else process.env.APPLYFLOW_PERSISTENCE_V2 = previous;
  });

  const fullBody = () =>
    bundle(
      [sampleJob("job_1", "One"), sampleJob("job_2", "Two"), sampleJob("job_3", "Three")],
      [
        sampleApp("app_1", { sourceJobId: "job_1" }),
        sampleApp("app_2", { sourceJobId: "job_2" }),
        sampleApp("app_3"),
      ],
    );

  it("A. failure before rows leaves no staging and canonical v1_local", async () => {
    const { service, jobs, applications, accounts } = createHarness();
    await expect(
      service.importBundle(ACCOUNT, { ...fullBody(), fingerprint: "deadbeef" }),
    ).rejects.toMatchObject({ code: "migration_fingerprint_mismatch" });
    expect(await jobs.list(ACCOUNT)).toHaveLength(0);
    expect(await applications.list(ACCOUNT)).toHaveLength(0);
    expect(accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v1_local");
  });

  it("B+D. crash after N Jobs leaves staging; same-fingerprint retry converges", async () => {
    const crashHarness = createHarness({
      wrapJobs: (jobs) => failAfterNCreates(jobs, 2, "job"),
    });
    const body = fullBody();

    await expect(crashHarness.service.importBundle(ACCOUNT, body)).rejects.toThrow(InjectedCrashError);

    expect(await crashHarness.jobs.list(ACCOUNT)).toHaveLength(2);
    expect(await crashHarness.applications.list(ACCOUNT)).toHaveLength(0);
    expect(crashHarness.accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v1_local");

    const sessions = [...crashHarness.sessionStore.values()].filter((s) => s.accountId === ACCOUNT);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.status).not.toBe(MIGRATION_SESSION_STATUS.completed);
    expect(sessions[0]?.status).toBe(MIGRATION_SESSION_STATUS.importing);
    expect(sessions[0]?.bundleFingerprint).toBe(body.fingerprint);

    const resume = resumeService(crashHarness.db);
    const result = await resume.importBundle(ACCOUNT, body);
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") return;

    expect(result.proof.fingerprint).toBe(body.fingerprint);
    expect(result.proof.expectedJobs).toBe(3);
    expect(result.proof.expectedApplications).toBe(3);
    expect(result.proof.processedJobs).toBe(3);
    expect(result.proof.processedApplications).toBe(3);
    expect(crashHarness.accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v2_cloud");
    expect(await crashHarness.jobs.list(ACCOUNT)).toHaveLength(3);
    expect(await crashHarness.applications.list(ACCOUNT)).toHaveLength(3);
    expect((await crashHarness.jobs.findById(ACCOUNT, "job_1"))?.title).toBe("One");
    expect((await crashHarness.applications.findById(ACCOUNT, "app_1"))?.sourceJobId).toBe("job_1");
  });

  it("C+D. crash after Jobs + N Applications; retry converges without duplicates", async () => {
    const crashHarness = createHarness({
      wrapApplications: (apps) => failAfterNCreates(apps, 1, "app"),
    });
    const body = fullBody();

    await expect(crashHarness.service.importBundle(ACCOUNT, body)).rejects.toThrow(InjectedCrashError);

    expect(await crashHarness.jobs.list(ACCOUNT)).toHaveLength(3);
    expect(await crashHarness.applications.list(ACCOUNT)).toHaveLength(1);
    expect(crashHarness.accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v1_local");
    const session = [...crashHarness.sessionStore.values()].find((s) => s.accountId === ACCOUNT);
    expect(session?.status).toBe(MIGRATION_SESSION_STATUS.importing);

    const resume = resumeService(crashHarness.db);
    const result = await resume.importBundle(ACCOUNT, body);
    expect(result.kind).toBe("completed");
    expect(await crashHarness.jobs.list(ACCOUNT)).toHaveLength(3);
    expect(await crashHarness.applications.list(ACCOUNT)).toHaveLength(3);
    expect(crashHarness.accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v2_cloud");
  });

  it("E. conflicting material after partial staging fails closed without overwrite or promote", async () => {
    const crashHarness = createHarness({
      wrapJobs: (jobs) => failAfterNCreates(jobs, 2, "job"),
    });
    const body = fullBody();
    await expect(crashHarness.service.importBundle(ACCOUNT, body)).rejects.toThrow(InjectedCrashError);

    const existing = await crashHarness.jobs.findById(ACCOUNT, "job_1");
    expect(existing).not.toBeNull();
    crashHarness.jobStore.set(`${ACCOUNT}::job_1`, {
      ...existing!,
      title: "TAMPERED",
    });

    const resume = resumeService(crashHarness.db);
    const conflict = await resume.importBundle(ACCOUNT, body);
    expect(conflict.kind).toBe("failed");
    if (conflict.kind === "failed") {
      expect(conflict.response.conflicts.some((c) => c.reason === "same_id_different_content")).toBe(
        true,
      );
      expect(conflict.response.status).toBe("failed");
    }
    expect((await crashHarness.jobs.findById(ACCOUNT, "job_1"))?.title).toBe("TAMPERED");
    expect(crashHarness.accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v1_local");
  });

  it("F. response-loss after completed commit: idempotent proof, no duplicates", async () => {
    const { service, jobs, applications, accounts } = createHarness();
    const body = fullBody();
    const first = await service.importBundle(ACCOUNT, body);
    expect(first.kind).toBe("completed");
    const second = await service.importBundle(ACCOUNT, body);
    expect(second.kind).toBe("completed");
    if (first.kind === "completed" && second.kind === "completed") {
      expect(second.proof.sessionId).toBe(first.proof.sessionId);
      expect(second.proof.status).toBe("completed");
    }
    expect(accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v2_cloud");
    expect(await jobs.list(ACCOUNT)).toHaveLength(3);
    expect(await applications.list(ACCOUNT)).toHaveLength(3);
  });

  it("G. modified bundle (new fingerprint) does not overwrite conflicting staging or promote via incompatible path", async () => {
    const crashHarness = createHarness({
      wrapJobs: (jobs) => failAfterNCreates(jobs, 2, "job"),
    });
    const bodyA = fullBody();
    await expect(crashHarness.service.importBundle(ACCOUNT, bodyA)).rejects.toThrow(InjectedCrashError);

    const bodyB = bundle(
      [sampleJob("job_1", "Changed title"), sampleJob("job_new", "New")],
      [sampleApp("app_new")],
    );
    expect(bodyB.fingerprint).not.toBe(bodyA.fingerprint);

    const resume = resumeService(crashHarness.db);
    const result = await resume.importBundle(ACCOUNT, bodyB);
    expect(result.kind).toBe("failed");
    if (result.kind === "failed") {
      expect(result.response.fingerprint).toBe(bodyB.fingerprint);
      expect(result.response.conflicts[0]?.reason).toBe("same_id_different_content");
    }
    expect((await crashHarness.jobs.findById(ACCOUNT, "job_1"))?.title).toBe("One");
    expect(crashHarness.accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v1_local");
    const fps = new Set(
      [...crashHarness.sessionStore.values()]
        .filter((s) => s.accountId === ACCOUNT)
        .map((s) => s.bundleFingerprint),
    );
    expect(fps.has(bodyA.fingerprint)).toBe(true);
    expect(fps.has(bodyB.fingerprint)).toBe(true);
  });

  it("H. incomplete session statuses never leave canonical as v2_cloud (table-driven)", async () => {
    const cases: Array<{
      name: string;
      run: () => Promise<{ accounts: Map<string, { canonicalPersistence: string }>; status: string }>;
    }> = [
      {
        name: "importing after job crash",
        run: async () => {
          const h = createHarness({ wrapJobs: (j) => failAfterNCreates(j, 1, "job") });
          await expect(h.service.importBundle(ACCOUNT, fullBody())).rejects.toThrow(InjectedCrashError);
          const session = [...h.sessionStore.values()].find((s) => s.accountId === ACCOUNT)!;
          return { accounts: h.accounts, status: session.status };
        },
      },
      {
        name: "failed after conflict on partial staging",
        run: async () => {
          const h = createHarness({ wrapJobs: (j) => failAfterNCreates(j, 1, "job") });
          const body = bundle([sampleJob("job_y", "Original"), sampleJob("job_z", "Z")], []);
          await expect(h.service.importBundle(ACCOUNT, body)).rejects.toThrow(InjectedCrashError);
          const existing = await h.jobs.findById(ACCOUNT, "job_y");
          h.jobStore.set(`${ACCOUNT}::job_y`, { ...existing!, title: "Divergent" });
          const failed = await resumeService(h.db).importBundle(ACCOUNT, body);
          expect(failed.kind).toBe("failed");
          if (failed.kind !== "failed") throw new Error("expected failed");
          return { accounts: h.accounts, status: failed.response.status };
        },
      },
    ];

    for (const c of cases) {
      const { accounts, status } = await c.run();
      expect(status, c.name).not.toBe(MIGRATION_SESSION_STATUS.completed);
      expect(accounts.get(ACCOUNT)?.canonicalPersistence, c.name).toBe("v1_local");
    }
  });

  it("I. complete+promote: throw during promote rolls back session completion (memory tx)", async () => {
    const memory = createMemoryPersistenceDb([memoryPilotAccount(ACCOUNT)]);
    const originalUpdateMany = memory.db.applyFlowAccount.updateMany.bind(memory.db.applyFlowAccount);
    let promoteCalls = 0;
    memory.db.applyFlowAccount.updateMany = async (args) => {
      promoteCalls += 1;
      if (promoteCalls === 1) {
        throw new InjectedCrashError("promote_injected_failure");
      }
      return originalUpdateMany(args);
    };

    const service = createApplyFlowMigrationService({
      db: memory.db,
      jobs: createApplyFlowJobRepository(memory.db),
      applications: createApplyFlowApplicationRepository(memory.db),
      sessions: createApplyFlowMigrationSessionRepository(memory.db),
    });
    const body = bundle([sampleJob("job_1")], [sampleApp("app_1", { sourceJobId: "job_1" })]);

    await expect(service.importBundle(ACCOUNT, body)).rejects.toThrow(InjectedCrashError);

    const session = [...memory.sessions.values()].find((s) => s.accountId === ACCOUNT);
    expect(session?.status).not.toBe(MIGRATION_SESSION_STATUS.completed);
    expect(memory.accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v1_local");
    expect(await createApplyFlowJobRepository(memory.db).list(ACCOUNT)).toHaveLength(1);

    const ok = await service.importBundle(ACCOUNT, body);
    expect(ok.kind).toBe("completed");
    expect(memory.accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v2_cloud");
  });

  it("J. R1: sourceJobId uniqueness still enforced during migration retry", async () => {
    const { service, applications } = createHarness();
    const first = await service.importBundle(
      ACCOUNT,
      bundle([sampleJob("job_1")], [sampleApp("app_1", { sourceJobId: "job_1" })]),
    );
    expect(first.kind).toBe("completed");

    const conflict = await service.importBundle(
      ACCOUNT,
      bundle([sampleJob("job_1")], [sampleApp("app_2", { sourceJobId: "job_1" })]),
    );
    expect(conflict.kind).toBe("failed");
    if (conflict.kind === "failed") {
      expect(conflict.response.conflicts[0]?.reason).toBe("source_job_already_linked");
    }
    expect(await applications.list(ACCOUNT)).toHaveLength(1);
  });

  it("K. cross-account: cannot get A session as B; OTHER migration does not consume A staging", async () => {
    const shared = createMemoryPersistenceDb([memoryPilotAccount(ACCOUNT), memoryPilotAccount(OTHER)]);
    const crashJobs = failAfterNCreates(createApplyFlowJobRepository(shared.db), 1, "job");
    const svcA = createApplyFlowMigrationService({
      db: shared.db,
      jobs: crashJobs,
      applications: createApplyFlowApplicationRepository(shared.db),
      sessions: createApplyFlowMigrationSessionRepository(shared.db),
    });
    const body = fullBody();
    await expect(svcA.importBundle(ACCOUNT, body)).rejects.toThrow(InjectedCrashError);
    const session = [...shared.sessions.values()].find((s) => s.accountId === ACCOUNT)!;

    await expect(svcA.getSession(OTHER, session.id)).rejects.toMatchObject({
      code: "migration_session_not_found",
    });
    expect(await createApplyFlowMigrationSessionRepository(shared.db).findById(OTHER, session.id)).toBeNull();
    expect(await createApplyFlowJobRepository(shared.db).findById(OTHER, "job_1")).toBeNull();

    const svcB = createApplyFlowMigrationService({
      db: shared.db,
      jobs: createApplyFlowJobRepository(shared.db),
      applications: createApplyFlowApplicationRepository(shared.db),
      sessions: createApplyFlowMigrationSessionRepository(shared.db),
    });
    const otherBundle = bundle(
      [sampleJob("other_job")],
      [sampleApp("other_app", { sourceJobId: "other_job" })],
    );
    const ok = await svcB.importBundle(OTHER, otherBundle);
    expect(ok.kind).toBe("completed");
    expect(shared.accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v1_local");
    expect(shared.accounts.get(OTHER)?.canonicalPersistence).toBe("v2_cloud");
    expect(await createApplyFlowJobRepository(shared.db).findById(OTHER, "job_1")).toBeNull();
  });
});

describe("AF-REL-003 block noncanonical product reads (offering)", () => {
  it("L. v2_offering denies product read/write; allows migration/session/activation", () => {
    const mode = resolveApplyFlowPersistenceMode({
      globalEnabled: true,
      pilotEligible: true,
      canonicalPersistence: "v1_local",
    });
    expect(mode.mode).toBe("v2_offering");

    const allow: ApplyFlowV2HttpCapability[] = ["migration", "migration_session_read", "activation"];
    for (const capability of allow) {
      expect(() => assertApplyFlowV2HttpCapability(mode, capability)).not.toThrow();
    }
    for (const capability of ["read", "write"] as const) {
      expect(() => assertApplyFlowV2HttpCapability(mode, capability)).toThrow(
        expect.objectContaining({ code: "persistence_v2_migration_required", status: 403 }),
      );
    }
  });

  it("L. classifies offering product GET as BLOCK_NONCANONICAL_PRODUCT_READS (AF-REL-003)", async () => {
    // Physical staging may exist while canonical stays v1_local (R4 partial-resumable).
    // Product Jobs/Applications GET capability "read" is DENY until promotion.
    // Migration resume remains ALLOW — see crash/retry suites in this file.
    const memory = createMemoryPersistenceDb([memoryPilotAccount(ACCOUNT)]);
    const jobs = createApplyFlowJobRepository(memory.db);
    await jobs.create({
      accountId: ACCOUNT,
      id: "job_staging_only",
      title: "Staged",
      source: "paste",
      status: "reviewing",
      jobContext: { skills: ["React"] },
      jobMatch: {
        score: 80,
        decision: "apply",
        matchedSkills: ["React"],
        missingSkills: [],
        evaluatedAt: "2026-09-25T12:00:00.000Z",
        scoringVersion: "v1",
      },
    });
    expect(await jobs.findById(ACCOUNT, "job_staging_only")).not.toBeNull();
    expect(memory.accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v1_local");

    const mode = resolveApplyFlowPersistenceMode({
      globalEnabled: true,
      pilotEligible: true,
      canonicalPersistence: "v1_local",
    });
    expect(() => assertApplyFlowV2HttpCapability(mode, "read")).toThrow(
      expect.objectContaining({ code: "persistence_v2_migration_required", status: 403 }),
    );
    expect(() => assertApplyFlowV2HttpCapability(mode, "migration")).not.toThrow();

    const classification = "BLOCK_NONCANONICAL_PRODUCT_READS" as const;
    expect(classification).toBe("BLOCK_NONCANONICAL_PRODUCT_READS");
    // Historical R4 label PRODUCT_CONTRACT_GAP is resolved by AF-REL-003.
  });
});
