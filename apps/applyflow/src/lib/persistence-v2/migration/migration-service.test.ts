import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApplyFlowApplicationRepository } from "../repositories/applications-repository";
import { createApplyFlowJobRepository } from "../repositories/jobs-repository";
import { createApplyFlowMigrationSessionRepository } from "../repositories/migration-session-repository";
import { createMemoryPersistenceDb, memoryPilotAccount } from "../test-memory-db";
import { fingerprintMigrationBundle } from "./migration-fingerprint";
import { createApplyFlowMigrationService } from "./migration-service";
import type { MigrationImportBody } from "./migration-dto";

const ACCOUNT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

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

function createService() {
  const memory = createMemoryPersistenceDb([memoryPilotAccount(ACCOUNT), memoryPilotAccount(OTHER)]);
  return {
    ...memory,
    service: createApplyFlowMigrationService({
      db: memory.db,
      jobs: createApplyFlowJobRepository(memory.db),
      applications: createApplyFlowApplicationRepository(memory.db),
      sessions: createApplyFlowMigrationSessionRepository(memory.db),
    }),
    jobs: createApplyFlowJobRepository(memory.db),
    applications: createApplyFlowApplicationRepository(memory.db),
    sessions: createApplyFlowMigrationSessionRepository(memory.db),
  };
}

describe("ApplyFlow migration service", () => {
  const previous = process.env.APPLYFLOW_PERSISTENCE_V2;
  beforeEach(() => {
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
    process.env.APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS = `${ACCOUNT},${OTHER}`;
  });
  const previousRollout = process.env.APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS;
  afterEach(() => {
    if (previous === undefined) delete process.env.APPLYFLOW_PERSISTENCE_V2;
    else process.env.APPLYFLOW_PERSISTENCE_V2 = previous;
    if (previousRollout === undefined) delete process.env.APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS;
    else process.env.APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS = previousRollout;
  });
  it("creates a session and imports jobs before applications with completion proof", async () => {
    const { service, jobs, applications, accounts } = createService();
    const body = bundle(
      [sampleJob("job_1"), sampleJob("job_2", "Other")],
      [
        sampleApp("app_1", { sourceJobId: "job_1" }),
        sampleApp("app_standalone"),
      ],
    );
    const result = await service.importBundle(ACCOUNT, body);
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") return;
    expect(result.proof).toMatchObject({
      status: "completed",
      fingerprint: body.fingerprint,
      expectedJobs: 2,
      expectedApplications: 2,
      processedJobs: 2,
      processedApplications: 2,
    });
    expect(result.proof.sessionId).toBeTruthy();
    expect(result.proof.completedAt).toBeTruthy();
    expect(accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v2_cloud");
    expect(await jobs.findById(ACCOUNT, "job_1")).not.toBeNull();
    expect(await applications.findById(ACCOUNT, "app_1")).toMatchObject({ sourceJobId: "job_1" });
    expect(await applications.findById(ACCOUNT, "app_standalone")).toMatchObject({
      sourceJobId: null,
    });
  });

  it("retries an identical completed bundle as idempotent success without duplicates", async () => {
    const { service, jobs } = createService();
    const body = bundle([sampleJob("job_1")], [sampleApp("app_1", { sourceJobId: "job_1" })]);
    const first = await service.importBundle(ACCOUNT, body);
    const second = await service.importBundle(ACCOUNT, body);
    expect(first.kind).toBe("completed");
    expect(second.kind).toBe("completed");
    if (first.kind === "completed" && second.kind === "completed") {
      expect(second.proof.sessionId).toBe(first.proof.sessionId);
    }
    const listed = await jobs.list(ACCOUNT);
    expect(listed).toHaveLength(1);
  });

  it("rejects fingerprint mismatch before writes", async () => {
    const { service, jobs } = createService();
    const body = bundle([sampleJob("job_1")], []);
    await expect(
      service.importBundle(ACCOUNT, { ...body, fingerprint: "deadbeef" }),
    ).rejects.toMatchObject({ code: "migration_fingerprint_mismatch" });
    expect(await jobs.list(ACCOUNT)).toHaveLength(0);
  });

  it("rejects duplicate ids in the bundle before writes", async () => {
    const { service, jobs } = createService();
    const jobsDup = [sampleJob("job_1"), sampleJob("job_1", "Other")];
    await expect(
      service.importBundle(ACCOUNT, {
        sourceVersion: 1,
        fingerprint: fingerprintMigrationBundle({ jobs: jobsDup, applications: [] }),
        jobs: jobsDup,
        applications: [],
      }),
    ).rejects.toMatchObject({ code: "invalid_migration_payload" });
    expect(await jobs.list(ACCOUNT)).toHaveLength(0);
  });

  it("skips equivalent existing ids and conflicts on divergent content without overwrite", async () => {
    const { service, jobs } = createService();
    const body = bundle([sampleJob("job_1", "Original")], []);
    expect((await service.importBundle(ACCOUNT, body)).kind).toBe("completed");

    const retryEquivalent = await service.importBundle(ACCOUNT, body);
    expect(retryEquivalent.kind).toBe("completed");

    const divergent = bundle([sampleJob("job_1", "Changed")], []);
    // Force same fingerprint path by creating a new session fingerprint for divergent content
    const conflict = await service.importBundle(ACCOUNT, divergent);
    expect(conflict.kind).toBe("failed");
    if (conflict.kind === "failed") {
      expect(conflict.response.conflicts).toEqual([
        { entityType: "job", entityId: "job_1", reason: "same_id_different_content" },
      ]);
    }
    expect((await jobs.findById(ACCOUNT, "job_1"))?.title).toBe("Original");
  });

  it("allows same canonicalUrl/descriptionHash under different ids", async () => {
    const { service, jobs } = createService();
    const sharedUrl = "https://jobs.example.com/role";
    const body = bundle(
      [
        { ...sampleJob("job_a"), url: sharedUrl, descriptionSnapshot: "Same text" },
        { ...sampleJob("job_b", "Other"), url: sharedUrl, descriptionSnapshot: "Same text" },
      ],
      [],
    );
    const result = await service.importBundle(ACCOUNT, body);
    expect(result.kind).toBe("completed");
    expect(await jobs.list(ACCOUNT)).toHaveLength(2);
  });

  it("conflicts when sourceJobId is missing or already linked to another application", async () => {
    const { service } = createService();
    const missing = await service.importBundle(
      ACCOUNT,
      bundle([], [sampleApp("app_1", { sourceJobId: "job_missing" })]),
    );
    expect(missing.kind).toBe("failed");
    if (missing.kind === "failed") {
      expect(missing.response.conflicts[0]?.reason).toBe("source_job_not_found");
    }

    const seeded = createService();
    await seeded.service.importBundle(
      ACCOUNT,
      bundle([sampleJob("job_1")], [sampleApp("app_1", { sourceJobId: "job_1" })]),
    );
    const linked = await seeded.service.importBundle(
      ACCOUNT,
      bundle([sampleJob("job_1")], [sampleApp("app_2", { sourceJobId: "job_1" })]),
    );
    expect(linked.kind).toBe("failed");
    if (linked.kind === "failed") {
      expect(linked.response.conflicts[0]?.reason).toBe("source_job_already_linked");
    }
  });

  it("accepts appliedAt for post-apply statuses and rejects it for early statuses", async () => {
    const { service, applications } = createService();
    const ok = await service.importBundle(
      ACCOUNT,
      bundle(
        [sampleJob("job_1")],
        [
          sampleApp("app_1", {
            sourceJobId: "job_1",
            status: "applied",
            appliedAt: "2026-09-20T10:00:00.000Z",
          }),
        ],
      ),
    );
    expect(ok.kind).toBe("completed");
    expect((await applications.findById(ACCOUNT, "app_1"))?.appliedAt?.toISOString()).toBe(
      "2026-09-20T10:00:00.000Z",
    );

    const bad = await service.importBundle(
      ACCOUNT,
      bundle(
        [sampleJob("job_2")],
        [
          sampleApp("app_2", {
            sourceJobId: "job_2",
            status: "reviewing",
            appliedAt: "2026-09-20T10:00:00.000Z",
          }),
        ],
      ),
    );
    expect(bad.kind).toBe("failed");
  });

  it("isolates sessions by account and does not expose cross-account sessions", async () => {
    const { service, sessions } = createService();
    const body = bundle([sampleJob("job_1")], []);
    const result = await service.importBundle(ACCOUNT, body);
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") return;
    await expect(service.getSession(OTHER, result.proof.sessionId)).rejects.toMatchObject({
      code: "migration_session_not_found",
    });
    expect(await sessions.findById(OTHER, result.proof.sessionId)).toBeNull();
  });

  it("does not treat a failed session as completed", async () => {
    const { service } = createService();
    const first = await service.importBundle(
      ACCOUNT,
      bundle([sampleJob("job_1", "A")], []),
    );
    expect(first.kind).toBe("completed");
    const failed = await service.importBundle(
      ACCOUNT,
      bundle([sampleJob("job_1", "B")], []),
    );
    expect(failed.kind).toBe("failed");
    if (failed.kind !== "failed") return;
    const viewed = await service.getSession(ACCOUNT, failed.response.sessionId);
    expect(viewed).toMatchObject({ status: "failed" });
    expect(viewed).not.toMatchObject({ status: "completed" });
  });
});
