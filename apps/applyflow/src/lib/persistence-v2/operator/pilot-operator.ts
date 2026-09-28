/**
 * Local-only ApplyFlow Persistence V2 pilot operator controls.
 *
 * Mutations may ONLY flip `pilotEligible`. Never touch `canonicalPersistence`.
 * There is intentionally no canonical setter / rollback-to-v1 command.
 */
import { createHash } from "node:crypto";

import type { ApplyFlowCanonicalPersistence } from "@prisma/client";

import { isApplyFlowPersistenceV2Enabled, type ApplyFlowPersistenceEnv } from "../feature-flag";
import {
  resolveApplyFlowPersistenceMode,
  type ApplyFlowPersistenceAccess,
} from "../resolve-persistence-access";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PilotOperatorAccountLookup =
  | { kind: "accountId"; value: string }
  | { kind: "authProviderSub"; value: string };

export type PilotOperatorAccountRow = {
  id: string;
  authProviderSub: string;
  pilotEligible: boolean;
  canonicalPersistence: ApplyFlowCanonicalPersistence;
};

export type PilotMigrationSessionSummary = {
  total: number;
  byStatus: Record<string, number>;
  latestStatus: string | null;
  latestIdFingerprint: string | null;
};

export type PilotOperatorStatusReport = {
  operation: "status";
  accountFound: boolean;
  accountFingerprint: string | null;
  lookupKind: PilotOperatorAccountLookup["kind"] | null;
  pilotEligible: boolean | null;
  canonicalPersistence: ApplyFlowCanonicalPersistence | null;
  globalEnabled: boolean;
  effectiveMode: ApplyFlowPersistenceAccess["mode"] | null;
  jobCount: number | null;
  applicationCount: number | null;
  migrationSessions: PilotMigrationSessionSummary | null;
  /** Target-bound confirmation token for a subsequent grant/revoke of THIS state. */
  confirmToken: string | null;
  timestamp: string;
};

export type PilotOperatorMutationResult = {
  operation: "grant" | "revoke";
  result:
    | "changed"
    | "already_granted"
    | "already_revoked"
    | "account_not_found"
    | "confirm_mismatch"
    | "confirm_required"
    | "state_conflict";
  changed: boolean;
  accountFingerprint: string | null;
  before: {
    pilotEligible: boolean | null;
    canonicalPersistence: ApplyFlowCanonicalPersistence | null;
  };
  after: {
    pilotEligible: boolean | null;
    canonicalPersistence: ApplyFlowCanonicalPersistence | null;
  };
  effectiveModeAfter: ApplyFlowPersistenceAccess["mode"] | null;
  globalEnabled: boolean;
  timestamp: string;
};

export class PilotOperatorError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PilotOperatorError";
    this.code = code;
  }
}

/**
 * Prefer exact ApplyFlowAccount.id (UUID). Otherwise exact authProviderSub.
 * Email / display-name / substring matching is intentionally rejected.
 */
export function parsePilotAccountIdentifier(raw: string): PilotOperatorAccountLookup {
  const value = raw.trim();
  if (!value) {
    throw new PilotOperatorError("empty_identifier", "Account identifier is required.");
  }
  if (value.includes("@")) {
    throw new PilotOperatorError(
      "email_lookup_forbidden",
      "Email lookup is not supported (PII / ambiguity). Use ApplyFlowAccount.id or exact authProviderSub.",
    );
  }
  if (UUID_RE.test(value)) {
    return { kind: "accountId", value: value.toLowerCase() };
  }
  return { kind: "authProviderSub", value };
}

/** Short non-secret account fingerprint for operator output / confirmation UX. */
export function fingerprintApplyFlowAccountId(accountId: string): string {
  return createHash("sha256").update(`applyflow-account:${accountId}`).digest("hex").slice(0, 12);
}

/**
 * Target-bound confirmation token.
 * Binds account id + current pilotEligible + current canonicalPersistence so a
 * stale preview cannot mutate a race-changed row.
 */
export function buildPilotConfirmToken(input: {
  accountId: string;
  pilotEligible: boolean;
  canonicalPersistence: ApplyFlowCanonicalPersistence;
}): string {
  return createHash("sha256")
    .update(
      `pilot-confirm:v1:${input.accountId}:${input.pilotEligible}:${input.canonicalPersistence}`,
    )
    .digest("hex")
    .slice(0, 16);
}

export type PilotOperatorDb = {
  applyFlowAccount: {
    findUnique: (args: {
      where: { id?: string; authProviderSub?: string };
      select?: {
        id?: boolean;
        authProviderSub?: boolean;
        pilotEligible?: boolean;
        canonicalPersistence?: boolean;
      };
    }) => Promise<PilotOperatorAccountRow | null>;
    updateMany: (args: {
      where: {
        id: string;
        pilotEligible: boolean;
        canonicalPersistence: ApplyFlowCanonicalPersistence;
      };
      data: { pilotEligible: boolean };
    }) => Promise<{ count: number }>;
  };
  applyFlowJob: {
    count: (args: { where: { accountId: string } }) => Promise<number>;
  };
  applyFlowApplication: {
    count: (args: { where: { accountId: string } }) => Promise<number>;
  };
  applyFlowMigrationSession: {
    findMany: (args: {
      where: { accountId: string };
      orderBy?: { updatedAt: "desc" | "asc" };
      select?: { id?: boolean; status?: boolean };
    }) => Promise<Array<{ id: string; status: string }>>;
  };
};

async function findAccount(
  db: PilotOperatorDb,
  lookup: PilotOperatorAccountLookup,
): Promise<PilotOperatorAccountRow | null> {
  if (lookup.kind === "accountId") {
    return db.applyFlowAccount.findUnique({
      where: { id: lookup.value },
      select: {
        id: true,
        authProviderSub: true,
        pilotEligible: true,
        canonicalPersistence: true,
      },
    });
  }
  return db.applyFlowAccount.findUnique({
    where: { authProviderSub: lookup.value },
    select: {
      id: true,
      authProviderSub: true,
      pilotEligible: true,
      canonicalPersistence: true,
    },
  });
}

function utcNow(): string {
  return new Date().toISOString();
}

function summarizeSessions(
  rows: Array<{ id: string; status: string }>,
): PilotMigrationSessionSummary {
  const byStatus: Record<string, number> = {};
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  }
  const latest = rows[0] ?? null;
  return {
    total: rows.length,
    byStatus,
    latestStatus: latest?.status ?? null,
    latestIdFingerprint: latest ? fingerprintApplyFlowAccountId(latest.id) : null,
  };
}

export async function getPilotOperatorStatus(
  db: PilotOperatorDb,
  lookup: PilotOperatorAccountLookup,
  env: ApplyFlowPersistenceEnv = process.env,
): Promise<PilotOperatorStatusReport> {
  const globalEnabled = isApplyFlowPersistenceV2Enabled(env);
  const account = await findAccount(db, lookup);
  if (!account) {
    return {
      operation: "status",
      accountFound: false,
      accountFingerprint: null,
      lookupKind: lookup.kind,
      pilotEligible: null,
      canonicalPersistence: null,
      globalEnabled,
      effectiveMode: null,
      jobCount: null,
      applicationCount: null,
      migrationSessions: null,
      confirmToken: null,
      timestamp: utcNow(),
    };
  }

  const [jobCount, applicationCount, sessions] = await Promise.all([
    db.applyFlowJob.count({ where: { accountId: account.id } }),
    db.applyFlowApplication.count({ where: { accountId: account.id } }),
    db.applyFlowMigrationSession.findMany({
      where: { accountId: account.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, status: true },
    }),
  ]);

  const access = resolveApplyFlowPersistenceMode({
    globalEnabled,
    pilotEligible: account.pilotEligible,
    canonicalPersistence: account.canonicalPersistence,
  });

  return {
    operation: "status",
    accountFound: true,
    accountFingerprint: fingerprintApplyFlowAccountId(account.id),
    lookupKind: lookup.kind,
    pilotEligible: account.pilotEligible,
    canonicalPersistence: account.canonicalPersistence,
    globalEnabled,
    effectiveMode: access.mode,
    jobCount,
    applicationCount,
    migrationSessions: summarizeSessions(sessions),
    confirmToken: buildPilotConfirmToken({
      accountId: account.id,
      pilotEligible: account.pilotEligible,
      canonicalPersistence: account.canonicalPersistence,
    }),
    timestamp: utcNow(),
  };
}

async function mutatePilotEligible(input: {
  db: PilotOperatorDb;
  lookup: PilotOperatorAccountLookup;
  confirm: string | undefined;
  desiredEligible: boolean;
  operation: "grant" | "revoke";
  env?: ApplyFlowPersistenceEnv;
}): Promise<PilotOperatorMutationResult> {
  const globalEnabled = isApplyFlowPersistenceV2Enabled(input.env ?? process.env);
  const empty = (
    result: PilotOperatorMutationResult["result"],
  ): PilotOperatorMutationResult => ({
    operation: input.operation,
    result,
    changed: false,
    accountFingerprint: null,
    before: { pilotEligible: null, canonicalPersistence: null },
    after: { pilotEligible: null, canonicalPersistence: null },
    effectiveModeAfter: null,
    globalEnabled,
    timestamp: utcNow(),
  });

  if (!input.confirm) {
    return empty("confirm_required");
  }

  const account = await findAccount(input.db, input.lookup);
  if (!account) {
    return empty("account_not_found");
  }

  const accountFingerprint = fingerprintApplyFlowAccountId(account.id);
  const expectedConfirm = buildPilotConfirmToken({
    accountId: account.id,
    pilotEligible: account.pilotEligible,
    canonicalPersistence: account.canonicalPersistence,
  });

  if (input.confirm !== expectedConfirm) {
    return {
      operation: input.operation,
      result: "confirm_mismatch",
      changed: false,
      accountFingerprint,
      before: {
        pilotEligible: account.pilotEligible,
        canonicalPersistence: account.canonicalPersistence,
      },
      after: {
        pilotEligible: account.pilotEligible,
        canonicalPersistence: account.canonicalPersistence,
      },
      effectiveModeAfter: resolveApplyFlowPersistenceMode({
        globalEnabled,
        pilotEligible: account.pilotEligible,
        canonicalPersistence: account.canonicalPersistence,
      }).mode,
      globalEnabled,
      timestamp: utcNow(),
    };
  }

  if (account.pilotEligible === input.desiredEligible) {
    const idempotent =
      input.operation === "grant" ? ("already_granted" as const) : ("already_revoked" as const);
    return {
      operation: input.operation,
      result: idempotent,
      changed: false,
      accountFingerprint,
      before: {
        pilotEligible: account.pilotEligible,
        canonicalPersistence: account.canonicalPersistence,
      },
      after: {
        pilotEligible: account.pilotEligible,
        canonicalPersistence: account.canonicalPersistence,
      },
      effectiveModeAfter: resolveApplyFlowPersistenceMode({
        globalEnabled,
        pilotEligible: account.pilotEligible,
        canonicalPersistence: account.canonicalPersistence,
      }).mode,
      globalEnabled,
      timestamp: utcNow(),
    };
  }

  const update = await input.db.applyFlowAccount.updateMany({
    where: {
      id: account.id,
      pilotEligible: account.pilotEligible,
      canonicalPersistence: account.canonicalPersistence,
    },
    data: { pilotEligible: input.desiredEligible },
  });

  if (update.count !== 1) {
    const refreshed = await findAccount(input.db, input.lookup);
    return {
      operation: input.operation,
      result: "state_conflict",
      changed: false,
      accountFingerprint,
      before: {
        pilotEligible: account.pilotEligible,
        canonicalPersistence: account.canonicalPersistence,
      },
      after: {
        pilotEligible: refreshed?.pilotEligible ?? null,
        canonicalPersistence: refreshed?.canonicalPersistence ?? null,
      },
      effectiveModeAfter: refreshed
        ? resolveApplyFlowPersistenceMode({
            globalEnabled,
            pilotEligible: refreshed.pilotEligible,
            canonicalPersistence: refreshed.canonicalPersistence,
          }).mode
        : null,
      globalEnabled,
      timestamp: utcNow(),
    };
  }

  const afterEligible = input.desiredEligible;
  const afterCanonical = account.canonicalPersistence;

  return {
    operation: input.operation,
    result: "changed",
    changed: true,
    accountFingerprint,
    before: {
      pilotEligible: account.pilotEligible,
      canonicalPersistence: account.canonicalPersistence,
    },
    after: {
      pilotEligible: afterEligible,
      canonicalPersistence: afterCanonical,
    },
    effectiveModeAfter: resolveApplyFlowPersistenceMode({
      globalEnabled,
      pilotEligible: afterEligible,
      canonicalPersistence: afterCanonical,
    }).mode,
    globalEnabled,
    timestamp: utcNow(),
  };
}

/** Grant: pilotEligible false → true. Never modifies canonicalPersistence. */
export async function grantPilotEligible(
  db: PilotOperatorDb,
  lookup: PilotOperatorAccountLookup,
  confirm: string | undefined,
  env?: ApplyFlowPersistenceEnv,
): Promise<PilotOperatorMutationResult> {
  return mutatePilotEligible({
    db,
    lookup,
    confirm,
    desiredEligible: true,
    operation: "grant",
    env,
  });
}

/** Revoke: pilotEligible true → false. Never modifies canonicalPersistence. */
export async function revokePilotEligible(
  db: PilotOperatorDb,
  lookup: PilotOperatorAccountLookup,
  confirm: string | undefined,
  env?: ApplyFlowPersistenceEnv,
): Promise<PilotOperatorMutationResult> {
  return mutatePilotEligible({
    db,
    lookup,
    confirm,
    desiredEligible: false,
    operation: "revoke",
    env,
  });
}

/** Explicit denylist of accidental operator surfaces — for tests / audits. */
export const PILOT_OPERATOR_FORBIDDEN_COMMANDS = [
  "canonical-set",
  "canonical-reset",
  "rollback-to-v1",
  "force-v1",
  "force-v2",
] as const;
