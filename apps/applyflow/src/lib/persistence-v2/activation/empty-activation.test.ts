import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  EMPTY_LEGACY_FINGERPRINT,
  LEGACY_EMPTY_ATTESTATION,
  EMPTY_ACTIVATION_PROTOCOL_VERSION,
  parseEmptyActivationBody,
  ApplyFlowEmptyActivationError,
} from "./empty-activation-dto";
import { createApplyFlowEmptyActivationService } from "./empty-activation-service";
import { createApplyFlowJobRepository } from "../repositories/jobs-repository";
import { createApplyFlowMigrationSessionRepository } from "../repositories/migration-session-repository";
import { createApplyFlowMigrationService } from "../migration/migration-service";
import { createApplyFlowApplicationRepository } from "../repositories/applications-repository";
import { fingerprintMigrationBundle } from "../migration/migration-fingerprint";
import { promoteApplyFlowCanonicalPersistenceToV2 } from "../promote-canonical-persistence";
import { createMemoryPersistenceDb, memoryPilotAccount } from "../test-memory-db";
import type { ApplyFlowAccountRecord } from "../require-applyflow-account";

const ACCOUNT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function asRecord(
  account: ReturnType<typeof memoryPilotAccount>,
): ApplyFlowAccountRecord {
  return {
    id: account.id,
    authProviderSub: account.authProviderSub,
    email: account.email,
    pilotEligible: account.pilotEligible,
    canonicalPersistence: account.canonicalPersistence,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

function emptyBody(overrides: Record<string, unknown> = {}) {
  return {
    protocolVersion: EMPTY_ACTIVATION_PROTOCOL_VERSION,
    attestation: LEGACY_EMPTY_ATTESTATION,
    sourceVersion: 1 as const,
    fingerprint: EMPTY_LEGACY_FINGERPRINT,
    jobs: [] as unknown[],
    applications: [] as unknown[],
    ...overrides,
  };
}

describe("promoteApplyFlowCanonicalPersistenceToV2", () => {
  it("promotes v1_local to v2_cloud once and is idempotent", async () => {
    const { db, accounts } = createMemoryPersistenceDb([memoryPilotAccount(ACCOUNT)]);
    const first = await promoteApplyFlowCanonicalPersistenceToV2(db, ACCOUNT);
    expect(first.kind).toBe("promoted");
    expect(accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v2_cloud");
    const second = await promoteApplyFlowCanonicalPersistenceToV2(db, ACCOUNT);
    expect(second.kind).toBe("already_v2");
  });

  it("never downgrades v2_cloud", async () => {
    const { db, accounts } = createMemoryPersistenceDb([
      memoryPilotAccount(ACCOUNT, { canonicalPersistence: "v2_cloud" }),
    ]);
    const result = await promoteApplyFlowCanonicalPersistenceToV2(db, ACCOUNT);
    expect(result.kind).toBe("already_v2");
    expect(accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v2_cloud");
  });
});

describe("empty activation", () => {
  const previous = process.env.APPLYFLOW_PERSISTENCE_V2;
  beforeEach(() => {
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
    process.env.APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS = ACCOUNT;
  });
  afterEach(() => {
    if (previous === undefined) delete process.env.APPLYFLOW_PERSISTENCE_V2;
    else process.env.APPLYFLOW_PERSISTENCE_V2 = previous;
  });

  it("activates empty offering account to v2_cloud", async () => {
    const memory = createMemoryPersistenceDb([memoryPilotAccount(ACCOUNT)]);
    const service = createApplyFlowEmptyActivationService({ db: memory.db });
    const proof = await service.activate(asRecord(memory.accounts.get(ACCOUNT)!), parseEmptyActivationBody(emptyBody()));
    expect(proof.status).toBe("activated");
    expect(proof.canonicalPersistence).toBe("v2_cloud");
    expect(memory.accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v2_cloud");
  });

  it("denies pilot=false", async () => {
    const memory = createMemoryPersistenceDb([
      memoryPilotAccount(ACCOUNT, { pilotEligible: false }),
    ]);
    const service = createApplyFlowEmptyActivationService({ db: memory.db });
    await expect(
      service.activate(asRecord(memory.accounts.get(ACCOUNT)!), parseEmptyActivationBody(emptyBody())),
    ).rejects.toMatchObject({ code: "persistence_v2_activation_not_eligible" });
  });

  it("denies GLOBAL=false while still v1_local", async () => {
    process.env.APPLYFLOW_PERSISTENCE_V2 = "false";
    const memory = createMemoryPersistenceDb([memoryPilotAccount(ACCOUNT)]);
    const service = createApplyFlowEmptyActivationService({ db: memory.db });
    await expect(
      service.activate(asRecord(memory.accounts.get(ACCOUNT)!), parseEmptyActivationBody(emptyBody())),
    ).rejects.toMatchObject({ code: "persistence_v2_activation_not_eligible" });
  });

  it("denies GLOBAL=false when already v2_cloud without claiming active", async () => {
    process.env.APPLYFLOW_PERSISTENCE_V2 = "false";
    const memory = createMemoryPersistenceDb([
      memoryPilotAccount(ACCOUNT, { canonicalPersistence: "v2_cloud" }),
    ]);
    const service = createApplyFlowEmptyActivationService({ db: memory.db });
    await expect(
      service.activate(asRecord(memory.accounts.get(ACCOUNT)!), parseEmptyActivationBody(emptyBody())),
    ).rejects.toMatchObject({ code: "persistence_v2_activation_paused" });
    expect(memory.accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v2_cloud");
  });

  it("denies when Job already exists", async () => {
    const memory = createMemoryPersistenceDb([memoryPilotAccount(ACCOUNT)]);
    const jobs = createApplyFlowJobRepository(memory.db);
    await jobs.create({
      accountId: ACCOUNT,
      id: "job_existing",
      title: "Existing",
      source: "paste",
      status: "reviewing",
      jobContext: { skills: [] },
      jobMatch: {
        score: 1,
        decision: "apply",
        matchedSkills: [],
        missingSkills: [],
        evaluatedAt: "2026-01-01T00:00:00.000Z",
        scoringVersion: "v1",
      },
    });
    const service = createApplyFlowEmptyActivationService({ db: memory.db });
    await expect(
      service.activate(asRecord(memory.accounts.get(ACCOUNT)!), parseEmptyActivationBody(emptyBody())),
    ).rejects.toMatchObject({ code: "persistence_v2_activation_not_empty" });
  });

  it("denies non-empty legacy attestation payload", async () => {
    expect(() =>
      parseEmptyActivationBody(
        emptyBody({
          jobs: [{ id: "x" }],
          fingerprint: fingerprintMigrationBundle({
            jobs: [
              {
                id: "x",
                title: "T",
                source: "paste",
                status: "reviewing",
                jobContext: { skills: [] },
                jobMatch: {
                  score: 1,
                  decision: "apply",
                  matchedSkills: [],
                  missingSkills: [],
                  evaluatedAt: "t",
                  scoringVersion: "v1",
                },
              },
            ],
            applications: [],
          }),
        }),
      ),
    ).toThrow(ApplyFlowEmptyActivationError);
  });

  it("duplicate activation is idempotent", async () => {
    const memory = createMemoryPersistenceDb([memoryPilotAccount(ACCOUNT)]);
    const service = createApplyFlowEmptyActivationService({ db: memory.db });
    const first = await service.activate(
      asRecord(memory.accounts.get(ACCOUNT)!),
      parseEmptyActivationBody(emptyBody()),
    );
    const second = await service.activate(
      asRecord({ ...memory.accounts.get(ACCOUNT)!, canonicalPersistence: "v2_cloud" }),
      parseEmptyActivationBody(emptyBody()),
    );
    expect(first.status).toBe("activated");
    expect(second.status).toBe("already_active");
    expect(memory.accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v2_cloud");
  });

  it("migration vs empty activation race — only one canonical path wins safely", async () => {
    const memory = createMemoryPersistenceDb([memoryPilotAccount(ACCOUNT)]);
    const migration = createApplyFlowMigrationService({
      db: memory.db,
      jobs: createApplyFlowJobRepository(memory.db),
      applications: createApplyFlowApplicationRepository(memory.db),
      sessions: createApplyFlowMigrationSessionRepository(memory.db),
    });
    const activation = createApplyFlowEmptyActivationService({ db: memory.db });

    const job = {
      id: "job_race",
      title: "Race",
      source: "paste" as const,
      status: "reviewing" as const,
      jobContext: { skills: ["React"] },
      jobMatch: {
        score: 80,
        decision: "apply" as const,
        matchedSkills: ["React"],
        missingSkills: [] as string[],
        evaluatedAt: "2026-09-25T12:00:00.000Z",
        scoringVersion: "v1",
      },
    };
    const body = {
      sourceVersion: 1 as const,
      fingerprint: fingerprintMigrationBundle({ jobs: [job], applications: [] }),
      jobs: [job],
      applications: [],
    };

    // Start migration first (imports data then promotes)
    const migrated = await migration.importBundle(ACCOUNT, body);
    expect(migrated.kind).toBe("completed");
    expect(memory.accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v2_cloud");

    // Empty activation after migration must be idempotent already_active (cloud has data,
    // but canonical is already v2 — short-circuit before empty checks).
    const activated = await activation.activate(
      asRecord({ ...memory.accounts.get(ACCOUNT)!, canonicalPersistence: "v2_cloud" }),
      parseEmptyActivationBody(emptyBody()),
    );
    expect(activated.status).toBe("already_active");
    expect(memory.accounts.get(ACCOUNT)?.canonicalPersistence).toBe("v2_cloud");
  });

  it("denies empty activation while a non-empty migration session is importing", async () => {
    const memory = createMemoryPersistenceDb([memoryPilotAccount(ACCOUNT)]);
    const sessions = createApplyFlowMigrationSessionRepository(memory.db);
    await sessions.create({
      accountId: ACCOUNT,
      sourceVersion: 1,
      bundleFingerprint: "busybusybusybusy",
      status: "importing",
      expectedJobs: 2,
      expectedApplications: 1,
    });
    const service = createApplyFlowEmptyActivationService({ db: memory.db });
    await expect(
      service.activate(asRecord(memory.accounts.get(ACCOUNT)!), parseEmptyActivationBody(emptyBody())),
    ).rejects.toMatchObject({ code: "persistence_v2_activation_conflict" });
  });
});
