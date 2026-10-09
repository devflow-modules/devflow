/**
 * R2.2.6 — pilot operator unit tests (status / grant / revoke / confirm / canonical preserve).
 */
import { afterEach, describe, expect, it } from "vitest";

import type { ApplyFlowCanonicalPersistence } from "@prisma/client";

import {
  APPLYFLOW_PRODUCTION_POOLER_HOST,
  APPLYFLOW_PRODUCTION_POOLER_HOST_FINGERPRINT,
  APPLYFLOW_PRODUCTION_SUPABASE_HOST,
  APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF,
  ApplyFlowDestructiveDbTargetDeniedError,
  ApplyFlowOperatorDbTargetDeniedError,
  assertApplyFlowDestructiveDbTargetAllowed,
  assertApplyFlowOperatorMutationTargetAllowed,
  classifyApplyFlowDbTarget,
  computeApplyFlowDbHostFingerprint,
} from "../db-target-guard";
import {
  buildPilotConfirmToken,
  fingerprintApplyFlowAccountId,
  getPilotOperatorStatus,
  grantPilotEligible,
  parsePilotAccountIdentifier,
  PILOT_OPERATOR_FORBIDDEN_COMMANDS,
  revokePilotEligible,
  type PilotOperatorAccountRow,
  type PilotOperatorDb,
} from "./pilot-operator";

function createOperatorMemoryDb(seed: PilotOperatorAccountRow[]): {
  db: PilotOperatorDb;
  accounts: Map<string, PilotOperatorAccountRow>;
} {
  const accounts = new Map(seed.map((a) => [a.id, { ...a }]));
  const jobs = new Map<string, number>();
  const applications = new Map<string, number>();
  const sessions = new Map<string, Array<{ id: string; status: string; updatedAt: string }>>();

  for (const a of seed) {
    jobs.set(a.id, 0);
    applications.set(a.id, 0);
    sessions.set(a.id, []);
  }

  const db: PilotOperatorDb = {
    applyFlowAccount: {
      findUnique: async ({ where }) => {
        if (where.id) return accounts.get(where.id) ?? null;
        if (where.authProviderSub) {
          return [...accounts.values()].find((a) => a.authProviderSub === where.authProviderSub) ?? null;
        }
        return null;
      },
      updateMany: async ({ where, data }) => {
        const row = accounts.get(where.id);
        if (
          !row ||
          row.pilotEligible !== where.pilotEligible ||
          row.canonicalPersistence !== where.canonicalPersistence
        ) {
          return { count: 0 };
        }
        row.pilotEligible = data.pilotEligible;
        accounts.set(where.id, row);
        return { count: 1 };
      },
    },
    applyFlowJob: {
      count: async ({ where }) => jobs.get(where.accountId) ?? 0,
    },
    applyFlowApplication: {
      count: async ({ where }) => applications.get(where.accountId) ?? 0,
    },
    applyFlowMigrationSession: {
      findMany: async ({ where }) => {
        const rows = [...(sessions.get(where.accountId) ?? [])].sort((a, b) =>
          a.updatedAt < b.updatedAt ? 1 : -1,
        );
        return rows.map(({ id, status }) => ({ id, status }));
      },
    },
  };

  return {
    db,
    accounts,
    setCounts(accountId: string, jobCount: number, applicationCount: number) {
      jobs.set(accountId, jobCount);
      applications.set(accountId, applicationCount);
    },
    addSession(accountId: string, id: string, status: string) {
      const list = sessions.get(accountId) ?? [];
      list.push({ id, status, updatedAt: new Date().toISOString() });
      sessions.set(accountId, list);
    },
  } as {
    db: PilotOperatorDb;
    accounts: Map<string, PilotOperatorAccountRow>;
    setCounts: (accountId: string, jobCount: number, applicationCount: number) => void;
    addSession: (accountId: string, id: string, status: string) => void;
  };
}

function account(
  id: string,
  pilotEligible: boolean,
  canonicalPersistence: ApplyFlowCanonicalPersistence,
): PilotOperatorAccountRow {
  return {
    id,
    authProviderSub: `sub_${id}`,
    pilotEligible,
    canonicalPersistence,
  };
}

describe("pilot operator account lookup", () => {
  it("accepts exact UUID as accountId", () => {
    expect(parsePilotAccountIdentifier("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee")).toEqual({
      kind: "accountId",
      value: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    });
  });

  it("accepts exact authProviderSub", () => {
    expect(parsePilotAccountIdentifier("supabase-user-subject-001")).toEqual({
      kind: "authProviderSub",
      value: "supabase-user-subject-001",
    });
  });

  it("rejects email lookup", () => {
    expect(() => parsePilotAccountIdentifier("user@example.com")).toThrow(/Email lookup/);
  });

  it("rejects empty identifier", () => {
    expect(() => parsePilotAccountIdentifier("  ")).toThrow(/required/);
  });
});

describe("pilot operator status / grant / revoke", () => {
  const ID_V1 = "11111111-1111-4111-8111-111111111111";
  const ID_V2 = "22222222-2222-4222-8222-222222222222";

  it("A: v1_local + pilot=false → grant → pilot=true, canonical remains v1_local", async () => {
    const { db, accounts } = createOperatorMemoryDb([account(ID_V1, false, "v1_local")]);
    const status = await getPilotOperatorStatus(db, { kind: "accountId", value: ID_V1 }, {
      APPLYFLOW_PERSISTENCE_V2: "false",
    });
    expect(status.accountFound).toBe(true);
    expect(status.pilotEligible).toBe(false);
    expect(status.canonicalPersistence).toBe("v1_local");
    expect(status.confirmToken).toBeTruthy();

    const granted = await grantPilotEligible(
      db,
      { kind: "accountId", value: ID_V1 },
      status.confirmToken!,
      { APPLYFLOW_PERSISTENCE_V2: "false" },
    );
    expect(granted.result).toBe("changed");
    expect(granted.after.pilotEligible).toBe(true);
    expect(granted.after.canonicalPersistence).toBe("v1_local");
    expect(accounts.get(ID_V1)?.canonicalPersistence).toBe("v1_local");
  });

  it("B: v1_local + pilot=true → revoke → pilot=false, canonical remains v1_local", async () => {
    const { db } = createOperatorMemoryDb([account(ID_V1, true, "v1_local")]);
    const status = await getPilotOperatorStatus(db, { kind: "accountId", value: ID_V1 });
    const revoked = await revokePilotEligible(
      db,
      { kind: "accountId", value: ID_V1 },
      status.confirmToken!,
    );
    expect(revoked.result).toBe("changed");
    expect(revoked.after.pilotEligible).toBe(false);
    expect(revoked.after.canonicalPersistence).toBe("v1_local");
  });

  it("C: v2_cloud + pilot=true → revoke → pilot=false, canonical remains v2_cloud", async () => {
    const { db, accounts } = createOperatorMemoryDb([account(ID_V2, true, "v2_cloud")]);
    const status = await getPilotOperatorStatus(
      db,
      { kind: "accountId", value: ID_V2 },
      { APPLYFLOW_PERSISTENCE_V2: "true", APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS: `${ID_V1},${ID_V2}` },
    );
    expect(status.effectiveMode).toBe("v2_active");

    const revoked = await revokePilotEligible(
      db,
      { kind: "accountId", value: ID_V2 },
      status.confirmToken!,
      { APPLYFLOW_PERSISTENCE_V2: "true", APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS: `${ID_V1},${ID_V2}` },
    );
    expect(revoked.result).toBe("changed");
    expect(revoked.after.pilotEligible).toBe(false);
    expect(revoked.after.canonicalPersistence).toBe("v2_cloud");
    expect(revoked.effectiveModeAfter).toBe("v2_read_only");
    expect(accounts.get(ID_V2)?.canonicalPersistence).toBe("v2_cloud");
  });

  it("D: v2_cloud + pilot=false → grant → pilot=true, canonical remains v2_cloud", async () => {
    const { db } = createOperatorMemoryDb([account(ID_V2, false, "v2_cloud")]);
    const status = await getPilotOperatorStatus(
      db,
      { kind: "accountId", value: ID_V2 },
      { APPLYFLOW_PERSISTENCE_V2: "true", APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS: `${ID_V1},${ID_V2}` },
    );
    expect(status.effectiveMode).toBe("v2_read_only");

    const granted = await grantPilotEligible(
      db,
      { kind: "accountId", value: ID_V2 },
      status.confirmToken!,
      { APPLYFLOW_PERSISTENCE_V2: "true", APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS: `${ID_V1},${ID_V2}` },
    );
    expect(granted.result).toBe("changed");
    expect(granted.after.pilotEligible).toBe(true);
    expect(granted.after.canonicalPersistence).toBe("v2_cloud");
    expect(granted.effectiveModeAfter).toBe("v2_active");
  });

  it("E: repeated grant is idempotent", async () => {
    const { db } = createOperatorMemoryDb([account(ID_V1, true, "v1_local")]);
    const status = await getPilotOperatorStatus(db, { kind: "accountId", value: ID_V1 });
    const again = await grantPilotEligible(
      db,
      { kind: "accountId", value: ID_V1 },
      status.confirmToken!,
    );
    expect(again.result).toBe("already_granted");
    expect(again.changed).toBe(false);
  });

  it("F: repeated revoke is idempotent", async () => {
    const { db } = createOperatorMemoryDb([account(ID_V1, false, "v1_local")]);
    const status = await getPilotOperatorStatus(db, { kind: "accountId", value: ID_V1 });
    const again = await revokePilotEligible(
      db,
      { kind: "accountId", value: ID_V1 },
      status.confirmToken!,
    );
    expect(again.result).toBe("already_revoked");
    expect(again.changed).toBe(false);
  });

  it("unknown account → no mutation", async () => {
    const { db } = createOperatorMemoryDb([]);
    const result = await grantPilotEligible(
      db,
      { kind: "accountId", value: ID_V1 },
      "deadbeefdeadbeef",
    );
    expect(result.result).toBe("account_not_found");
    expect(result.changed).toBe(false);
  });

  it("wrong confirmation → no mutation", async () => {
    const { db, accounts } = createOperatorMemoryDb([account(ID_V1, false, "v1_local")]);
    const result = await grantPilotEligible(
      db,
      { kind: "accountId", value: ID_V1 },
      "wrong-confirm-tok",
    );
    expect(result.result).toBe("confirm_mismatch");
    expect(accounts.get(ID_V1)?.pilotEligible).toBe(false);
  });

  it("missing confirmation → no mutation", async () => {
    const { db, accounts } = createOperatorMemoryDb([account(ID_V1, false, "v1_local")]);
    const result = await grantPilotEligible(db, { kind: "accountId", value: ID_V1 }, undefined);
    expect(result.result).toBe("confirm_required");
    expect(accounts.get(ID_V1)?.pilotEligible).toBe(false);
  });

  it("confirm token binds state — stale token fails after intervening change", async () => {
    const mem = createOperatorMemoryDb([account(ID_V1, false, "v1_local")]);
    const status = await getPilotOperatorStatus(mem.db, { kind: "accountId", value: ID_V1 });
    // intervening grant with fresh token
    await grantPilotEligible(mem.db, { kind: "accountId", value: ID_V1 }, status.confirmToken!);
    // stale preview token must not revoke
    const stale = await revokePilotEligible(
      mem.db,
      { kind: "accountId", value: ID_V1 },
      status.confirmToken!,
    );
    expect(stale.result).toBe("confirm_mismatch");
    expect(mem.accounts.get(ID_V1)?.pilotEligible).toBe(true);
  });

  it("status omits secrets and includes sanitized counts", async () => {
    const mem = createOperatorMemoryDb([account(ID_V1, false, "v1_local")]);
    mem.setCounts(ID_V1, 3, 2);
    mem.addSession(ID_V1, "33333333-3333-4333-8333-333333333333", "completed");
    const status = await getPilotOperatorStatus(mem.db, { kind: "accountId", value: ID_V1 });
    const json = JSON.stringify(status);
    expect(json).not.toMatch(/postgresql:/i);
    expect(json).not.toMatch(/password/i);
    expect(status.jobCount).toBe(3);
    expect(status.applicationCount).toBe(2);
    expect(status.migrationSessions?.total).toBe(1);
    expect(status.accountFingerprint).toBe(fingerprintApplyFlowAccountId(ID_V1));
  });

  it("v2_cloud revoke with GLOBAL=false yields v2_paused semantics", async () => {
    const { db } = createOperatorMemoryDb([account(ID_V2, true, "v2_cloud")]);
    const status = await getPilotOperatorStatus(
      db,
      { kind: "accountId", value: ID_V2 },
      { APPLYFLOW_PERSISTENCE_V2: "true", APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS: `${ID_V1},${ID_V2}` },
    );
    const revoked = await revokePilotEligible(
      db,
      { kind: "accountId", value: ID_V2 },
      status.confirmToken!,
      { APPLYFLOW_PERSISTENCE_V2: "false" },
    );
    expect(revoked.after.canonicalPersistence).toBe("v2_cloud");
    expect(revoked.effectiveModeAfter).toBe("v2_paused");
  });
});

describe("pilot operator target safety", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("pooler host fingerprint matches recorded Production identity", () => {
    expect(computeApplyFlowDbHostFingerprint(APPLYFLOW_PRODUCTION_POOLER_HOST)).toBe(
      APPLYFLOW_PRODUCTION_POOLER_HOST_FINGERPRINT,
    );
  });

  it("operator allows safe_local without --production", () => {
    const env = {
      DATABASE_URL: "postgresql://applyflow:applyflow_local_dev@localhost:5434/applyflow",
      DIRECT_URL: "postgresql://applyflow:applyflow_local_dev@127.0.0.1:5434/applyflow",
    };
    expect(() =>
      assertApplyFlowOperatorMutationTargetAllowed(env, { allowProductionMutation: false }),
    ).not.toThrow();
  });

  it("operator rejects --production against safe_local", () => {
    const env = {
      DATABASE_URL: "postgresql://applyflow:x@localhost:5434/applyflow",
    };
    expect(() =>
      assertApplyFlowOperatorMutationTargetAllowed(env, { allowProductionMutation: true }),
    ).toThrow(ApplyFlowOperatorDbTargetDeniedError);
  });

  it("Production without --production is denied (double-gate A)", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: `https://${APPLYFLOW_PRODUCTION_SUPABASE_HOST}`,
      DATABASE_URL: `postgresql://postgres.${APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF}:x@${APPLYFLOW_PRODUCTION_POOLER_HOST}:6543/postgres`,
    };
    expect(classifyApplyFlowDbTarget(env).kind).toBe("production");
    expect(() =>
      assertApplyFlowOperatorMutationTargetAllowed(env, { allowProductionMutation: false }),
    ).toThrow(/requires explicit --production/);
  });

  it("Production with --production but wrong host confirm is denied (double-gate B)", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: `https://${APPLYFLOW_PRODUCTION_SUPABASE_HOST}`,
      DATABASE_URL: `postgresql://postgres.${APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF}:x@${APPLYFLOW_PRODUCTION_POOLER_HOST}:6543/postgres`,
    };
    expect(() =>
      assertApplyFlowOperatorMutationTargetAllowed(env, {
        allowProductionMutation: true,
        productionHostConfirm: "0000000000000000",
      }),
    ).toThrow(/confirm-production/);
  });

  it("Production with --production + matching host fingerprint is allowed for operator only", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: `https://${APPLYFLOW_PRODUCTION_SUPABASE_HOST}`,
      DATABASE_URL: `postgresql://postgres.${APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF}:x@${APPLYFLOW_PRODUCTION_POOLER_HOST}:6543/postgres`,
      DIRECT_URL: `postgresql://postgres.${APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF}:x@${APPLYFLOW_PRODUCTION_POOLER_HOST}:5432/postgres`,
    };
    const report = assertApplyFlowOperatorMutationTargetAllowed(env, {
      allowProductionMutation: true,
      productionHostConfirm: APPLYFLOW_PRODUCTION_POOLER_HOST_FINGERPRINT,
    });
    expect(report.kind).toBe("production");
    // Normal destructive scripts remain DENY
    expect(() => assertApplyFlowDestructiveDbTargetAllowed(env)).toThrow(
      ApplyFlowDestructiveDbTargetDeniedError,
    );
  });

  it("unknown remote / supabase / malformed remain denied for operator", () => {
    expect(() =>
      assertApplyFlowOperatorMutationTargetAllowed(
        { DATABASE_URL: "postgresql://u:p@db.example.internal:5432/x" },
        { allowProductionMutation: false },
      ),
    ).toThrow(ApplyFlowOperatorDbTargetDeniedError);

    expect(() =>
      assertApplyFlowOperatorMutationTargetAllowed(
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnop.supabase.co",
          DATABASE_URL: "postgresql://u:p@db.abcdefghijklmnop.supabase.co:5432/postgres",
        },
        { allowProductionMutation: true, productionHostConfirm: "anything" },
      ),
    ).toThrow(ApplyFlowOperatorDbTargetDeniedError);

    expect(() =>
      assertApplyFlowOperatorMutationTargetAllowed(
        { DATABASE_URL: "not-a-url" },
        { allowProductionMutation: false },
      ),
    ).toThrow(ApplyFlowOperatorDbTargetDeniedError);

    expect(() =>
      assertApplyFlowOperatorMutationTargetAllowed({}, { allowProductionMutation: false }),
    ).toThrow(ApplyFlowOperatorDbTargetDeniedError);
  });

  it("confirm token does not embed secrets", () => {
    const token = buildPilotConfirmToken({
      accountId: "11111111-1111-4111-8111-111111111111",
      pilotEligible: false,
      canonicalPersistence: "v1_local",
    });
    expect(token).toMatch(/^[a-f0-9]{16}$/);
    expect(token).not.toContain("postgresql");
  });
});

describe("no canonical setter surface", () => {
  it("forbidden commands list covers rollback/force paths", () => {
    expect(PILOT_OPERATOR_FORBIDDEN_COMMANDS).toEqual(
      expect.arrayContaining([
        "canonical-set",
        "canonical-reset",
        "rollback-to-v1",
        "force-v1",
        "force-v2",
      ]),
    );
  });
});
