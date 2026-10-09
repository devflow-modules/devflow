/**
 * R2.2.6 — local Docker validation of pilot operator grant/revoke.
 * Mutates disposable local rows only. Production / Supabase denylisted.
 * Skips in CI when DATABASE_URL / .env.local are absent (no Docker Postgres).
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { applyflowPrisma } from "@/lib/persistence-v2/db";
import {
  ApplyFlowDestructiveDbTargetDeniedError,
  assertApplyFlowDestructiveDbTargetAllowed,
  assertApplyFlowOperatorMutationTargetAllowed,
  classifyApplyFlowDbTarget,
} from "@/lib/persistence-v2/db-target-guard";
import { loadApplyFlowEnvLocalIfPresent } from "@/lib/persistence-v2/migration/f3-5-dev-environment";
import {
  getPilotOperatorStatus,
  grantPilotEligible,
  revokePilotEligible,
} from "@/lib/persistence-v2/operator/pilot-operator";

const FIXTURE_AUTH_PREFIX = "r226_pilot_ops_";

loadApplyFlowEnvLocalIfPresent();
const localDbAvailable = classifyApplyFlowDbTarget().kind === "safe_local";

describe.skipIf(!localDbAvailable)("R2.2.6 local Docker pilot operator", () => {
  const createdAccountIds: string[] = [];
  let dbReady = false;

  beforeAll(async () => {
    const classification = classifyApplyFlowDbTarget();
    expect(classification.kind).toBe("safe_local");
    expect(() => assertApplyFlowDestructiveDbTargetAllowed()).not.toThrow(
      ApplyFlowDestructiveDbTargetDeniedError,
    );
    expect(() =>
      assertApplyFlowOperatorMutationTargetAllowed(undefined, { allowProductionMutation: false }),
    ).not.toThrow();

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

  async function seedAccount(opts: {
    pilotEligible: boolean;
    canonicalPersistence: "v1_local" | "v2_cloud";
  }) {
    const account = await applyflowPrisma.applyFlowAccount.create({
      data: {
        authProviderSub: `${FIXTURE_AUTH_PREFIX}${randomUUID()}`,
        email: "r226-operator@example.test",
        pilotEligible: opts.pilotEligible,
        canonicalPersistence: opts.canonicalPersistence,
      },
    });
    createdAccountIds.push(account.id);
    return account;
  }

  it("A/B: v1_local grant then revoke preserves canonical", async () => {
    expect(dbReady).toBe(true);
    const account = await seedAccount({ pilotEligible: false, canonicalPersistence: "v1_local" });

    const before = await getPilotOperatorStatus(applyflowPrisma, {
      kind: "accountId",
      value: account.id,
    });
    expect(before.confirmToken).toBeTruthy();

    const granted = await grantPilotEligible(
      applyflowPrisma,
      { kind: "accountId", value: account.id },
      before.confirmToken!,
    );
    expect(granted.result).toBe("changed");
    expect(granted.after.canonicalPersistence).toBe("v1_local");

    const mid = await getPilotOperatorStatus(applyflowPrisma, {
      kind: "accountId",
      value: account.id,
    });
    const revoked = await revokePilotEligible(
      applyflowPrisma,
      { kind: "accountId", value: account.id },
      mid.confirmToken!,
    );
    expect(revoked.result).toBe("changed");
    expect(revoked.after.pilotEligible).toBe(false);
    expect(revoked.after.canonicalPersistence).toBe("v1_local");

    const row = await applyflowPrisma.applyFlowAccount.findUniqueOrThrow({
      where: { id: account.id },
    });
    expect(row.canonicalPersistence).toBe("v1_local");
    expect(row.pilotEligible).toBe(false);
  });

  it("C/D: v2_cloud revoke then grant preserves canonical", async () => {
    expect(dbReady).toBe(true);
    const account = await seedAccount({ pilotEligible: true, canonicalPersistence: "v2_cloud" });

    const rolloutEnv = {
      APPLYFLOW_PERSISTENCE_V2: "true",
      APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS: account.id,
    };
    const before = await getPilotOperatorStatus(
      applyflowPrisma,
      { kind: "accountId", value: account.id },
      rolloutEnv,
    );
    expect(before.effectiveMode).toBe("v2_active");

    const revoked = await revokePilotEligible(
      applyflowPrisma,
      { kind: "accountId", value: account.id },
      before.confirmToken!,
      rolloutEnv,
    );
    expect(revoked.after.pilotEligible).toBe(false);
    expect(revoked.after.canonicalPersistence).toBe("v2_cloud");
    expect(revoked.effectiveModeAfter).toBe("v2_read_only");

    const mid = await getPilotOperatorStatus(
      applyflowPrisma,
      { kind: "accountId", value: account.id },
      rolloutEnv,
    );
    const granted = await grantPilotEligible(
      applyflowPrisma,
      { kind: "accountId", value: account.id },
      mid.confirmToken!,
      rolloutEnv,
    );
    expect(granted.after.pilotEligible).toBe(true);
    expect(granted.after.canonicalPersistence).toBe("v2_cloud");

    const row = await applyflowPrisma.applyFlowAccount.findUniqueOrThrow({
      where: { id: account.id },
    });
    expect(row.canonicalPersistence).toBe("v2_cloud");
    expect(row.pilotEligible).toBe(true);
  });

  it("lookup by authProviderSub works exactly", async () => {
    expect(dbReady).toBe(true);
    const account = await seedAccount({ pilotEligible: false, canonicalPersistence: "v1_local" });
    const status = await getPilotOperatorStatus(applyflowPrisma, {
      kind: "authProviderSub",
      value: account.authProviderSub,
    });
    expect(status.accountFound).toBe(true);
    expect(status.pilotEligible).toBe(false);
  });
});
