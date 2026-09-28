/**
 * R2.2.1 — account pilot state schema defaults + constraints.
 * Mutates disposable local Docker rows only. Production / Supabase denylisted.
 * Skips in CI when DATABASE_URL / .env.local are absent (no Docker Postgres).
 */
import { randomUUID } from "node:crypto";

import { ApplyFlowCanonicalPersistence, Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { applyflowPrisma } from "@/lib/persistence-v2/db";
import {
  ApplyFlowDestructiveDbTargetDeniedError,
  assertApplyFlowDestructiveDbTargetAllowed,
  classifyApplyFlowDbTarget,
} from "@/lib/persistence-v2/db-target-guard";
import { loadApplyFlowEnvLocalIfPresent } from "@/lib/persistence-v2/migration/f3-5-dev-environment";

const FIXTURE_AUTH_PREFIX = "r221_pilot_state_";

loadApplyFlowEnvLocalIfPresent();
const localDbAvailable = classifyApplyFlowDbTarget().kind === "safe_local";

describe.skipIf(!localDbAvailable)("R2.2.1 ApplyFlowAccount pilot state schema", () => {
  const createdAccountIds: string[] = [];
  let dbReady = false;

  beforeAll(async () => {
    const classification = classifyApplyFlowDbTarget();
    expect(classification.kind).toBe("safe_local");
    expect(classification.allowedForDestructiveTests).toBe(true);
    expect(() => assertApplyFlowDestructiveDbTargetAllowed()).not.toThrow(
      ApplyFlowDestructiveDbTargetDeniedError,
    );

    await applyflowPrisma.$queryRaw`SELECT 1`;
    dbReady = true;
  });

  afterAll(async () => {
    if (!dbReady) return;
    for (const id of createdAccountIds) {
      await applyflowPrisma.applyFlowJob.deleteMany({ where: { accountId: id } });
      await applyflowPrisma.applyFlowApplication.deleteMany({ where: { accountId: id } });
      await applyflowPrisma.applyFlowMigrationSession.deleteMany({ where: { accountId: id } });
      await applyflowPrisma.applyFlowAccount.deleteMany({ where: { id } });
    }
    await applyflowPrisma.$disconnect();
  });

  it("creates accounts with pilotEligible=false and canonicalPersistence=v1_local", async () => {
    expect(dbReady).toBe(true);
    const authSub = `${FIXTURE_AUTH_PREFIX}${randomUUID()}`;
    const account = await applyflowPrisma.applyFlowAccount.create({
      data: { authProviderSub: authSub, email: "r221-default@example.test" },
    });
    createdAccountIds.push(account.id);

    expect(account.pilotEligible).toBe(false);
    expect(account.canonicalPersistence).toBe(ApplyFlowCanonicalPersistence.v1_local);

    const reloaded = await applyflowPrisma.applyFlowAccount.findUniqueOrThrow({
      where: { id: account.id },
    });
    expect(reloaded.pilotEligible).toBe(false);
    expect(reloaded.canonicalPersistence).toBe("v1_local");
  });

  it("fills defaults for inserts that omit the new columns (existing-row semantics)", async () => {
    expect(dbReady).toBe(true);
    const id = randomUUID();
    const authSub = `${FIXTURE_AUTH_PREFIX}omit_${randomUUID()}`;
    await applyflowPrisma.$executeRaw`
      INSERT INTO "applyflow_accounts" ("id", "auth_provider_sub", "email", "created_at", "updated_at")
      VALUES (${id}::uuid, ${authSub}, ${"r221-omit@example.test"}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    createdAccountIds.push(id);

    const row = await applyflowPrisma.applyFlowAccount.findUniqueOrThrow({ where: { id } });
    expect(row.pilotEligible).toBe(false);
    expect(row.canonicalPersistence).toBe(ApplyFlowCanonicalPersistence.v1_local);

    const jobId = `job_r221_${randomUUID().slice(0, 8)}`;
    await applyflowPrisma.applyFlowJob.create({
      data: {
        accountId: id,
        id: jobId,
        title: "R2.2.1 compatibility job",
        source: "manual",
        status: "saved",
        jobContext: { skills: [] },
        jobMatch: {},
      },
    });

    const jobs = await applyflowPrisma.applyFlowJob.findMany({ where: { accountId: id } });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.id).toBe(jobId);

    const accountStill = await applyflowPrisma.applyFlowAccount.findUniqueOrThrow({
      where: { id },
    });
    expect(accountStill.pilotEligible).toBe(false);
    expect(accountStill.canonicalPersistence).toBe("v1_local");
  });

  it("rejects unsupported canonical_persistence values at the database", async () => {
    expect(dbReady).toBe(true);
    const id = randomUUID();
    const authSub = `${FIXTURE_AUTH_PREFIX}bad_${randomUUID()}`;

    await expect(
      applyflowPrisma.$executeRaw`
        INSERT INTO "applyflow_accounts" (
          "id", "auth_provider_sub", "email", "pilot_eligible", "canonical_persistence",
          "created_at", "updated_at"
        ) VALUES (
          ${id}::uuid, ${authSub}, ${"r221-bad@example.test"}, false, 'paused'::"ApplyFlowCanonicalPersistence",
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `,
    ).rejects.toThrow();

    await expect(
      applyflowPrisma.$executeRawUnsafe(
        `INSERT INTO "applyflow_accounts" (
          "id", "auth_provider_sub", "email", "pilot_eligible", "canonical_persistence",
          "created_at", "updated_at"
        ) VALUES (
          $1::uuid, $2, $3, false, 'v2',
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )`,
        id,
        authSub,
        "r221-bad2@example.test",
      ),
    ).rejects.toThrow();

    const missing = await applyflowPrisma.applyFlowAccount.findUnique({ where: { id } });
    expect(missing).toBeNull();
  });

  it("exposes only v1_local and v2_cloud on the Prisma enum", () => {
    expect(Object.values(ApplyFlowCanonicalPersistence).sort()).toEqual(["v1_local", "v2_cloud"]);
    expect(ApplyFlowCanonicalPersistence.v1_local).toBe("v1_local");
    expect(ApplyFlowCanonicalPersistence.v2_cloud).toBe("v2_cloud");
  });

  it("documents column defaults in information_schema", async () => {
    expect(dbReady).toBe(true);
    const cols = await applyflowPrisma.$queryRaw<
      Array<{ column_name: string; column_default: string | null; is_nullable: string }>
    >`
      SELECT column_name, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'applyflow_accounts'
        AND column_name IN ('pilot_eligible', 'canonical_persistence')
      ORDER BY column_name
    `;
    expect(cols).toHaveLength(2);
    const byName = Object.fromEntries(cols.map((c) => [c.column_name, c]));
    expect(byName.pilot_eligible.is_nullable).toBe("NO");
    expect(byName.canonical_persistence.is_nullable).toBe("NO");
    expect(String(byName.pilot_eligible.column_default)).toMatch(/false/i);
    expect(String(byName.canonical_persistence.column_default)).toMatch(/v1_local/);
  });

  it("rejects Prisma client writes with an invalid enum via unchecked cast path", async () => {
    expect(dbReady).toBe(true);
    const authSub = `${FIXTURE_AUTH_PREFIX}prisma_bad_${randomUUID()}`;
    await expect(
      applyflowPrisma.applyFlowAccount.create({
        data: {
          authProviderSub: authSub,
          // Force an illegal value past TypeScript; Prisma validates before SQL.
          canonicalPersistence: "migrating" as unknown as ApplyFlowCanonicalPersistence,
        },
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError);
  });
});
