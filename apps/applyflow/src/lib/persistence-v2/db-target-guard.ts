/**
 * Structural classification of ApplyFlow database targets for destructive tests/tools.
 *
 * PRODUCTION (qygwhuwvilkekfkgoizb) is always DENY.
 * Unknown remotes and any *.supabase.co host are DENY.
 * Only explicit local/ephemeral hosts are ALLOW.
 *
 * Never logs credentials or full connection strings.
 */

import { createHash } from "node:crypto";

/** Canonical ApplyFlow Production Supabase project — never a DEV/E2E target. */
export const APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF = "qygwhuwvilkekfkgoizb";
export const APPLYFLOW_PRODUCTION_SUPABASE_HOST = `${APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`;

/** Known Production pooler host (sa-east-1). Fingerprint is a non-secret identity proof. */
export const APPLYFLOW_PRODUCTION_POOLER_HOST = "aws-0-sa-east-1.pooler.supabase.com";

/**
 * Previously recorded SHA-256(host).slice(0, 16) for APPLYFLOW_PRODUCTION_POOLER_HOST.
 * Used as the operator `--confirm-production` target when DATABASE_URL uses the pooler.
 */
export const APPLYFLOW_PRODUCTION_POOLER_HOST_FINGERPRINT = "3c193d95207920e0";

/** Hosts allowed for destructive DB tests (local Docker / ephemeral CI). */
export const APPLYFLOW_SAFE_DESTRUCTIVE_DB_HOSTS = ["localhost", "127.0.0.1"] as const;

/** Non-reversible host fingerprint for sanitized operator output / Production confirm. */
export function computeApplyFlowDbHostFingerprint(host: string): string {
  return createHash("sha256").update(host).digest("hex").slice(0, 16);
}

export type ApplyFlowDbTargetKind =
  | "production"
  | "supabase_remote"
  | "safe_local"
  | "unknown_remote"
  | "missing"
  | "unparseable";

export type ApplyFlowDbTargetClassification = {
  kind: ApplyFlowDbTargetKind;
  allowedForDestructiveTests: boolean;
  dbHost: string;
  supabaseHost: string;
  dbName: string;
  reason: string;
};

export type ApplyFlowDbTargetEnv = {
  DATABASE_URL?: string;
  DIRECT_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  APPLYFLOW_DB_TARGET?: string;
  APPLYFLOW_PERSISTENCE_V2?: string;
};

function hostnameOf(raw: string | undefined): string {
  if (!raw || !raw.trim()) return "missing";
  try {
    return new URL(raw).hostname;
  } catch {
    return "unparseable";
  }
}

function dbNameOf(raw: string | undefined): string {
  if (!raw || !raw.trim()) return "missing";
  try {
    return new URL(raw).pathname.replace(/^\//, "") || "?";
  } catch {
    return "unparseable";
  }
}

function isSafeLocalHost(host: string): boolean {
  return (APPLYFLOW_SAFE_DESTRUCTIVE_DB_HOSTS as readonly string[]).includes(host);
}

function isSupabaseHost(host: string): boolean {
  return (
    host === "supabase.co" ||
    host.endsWith(".supabase.co") ||
    host === "supabase.com" ||
    host.endsWith(".supabase.com")
  );
}

function isProductionSupabaseHost(host: string): boolean {
  return (
    host === APPLYFLOW_PRODUCTION_SUPABASE_HOST ||
    host.startsWith(`${APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF}.`) ||
    host.includes(`.${APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF}.`)
  );
}

/**
 * Classifies DATABASE_URL (+ optional Supabase public URL) without reading secrets.
 * Fail-closed: anything that is not an explicit safe local/ephemeral host is denied.
 */
function resolveEnv(env?: ApplyFlowDbTargetEnv): ApplyFlowDbTargetEnv {
  return env ?? (process.env as ApplyFlowDbTargetEnv);
}

export function classifyApplyFlowDbTarget(
  env?: ApplyFlowDbTargetEnv,
): ApplyFlowDbTargetClassification {
  const resolved = resolveEnv(env);
  const dbHost = hostnameOf(resolved.DATABASE_URL);
  const directHost = hostnameOf(resolved.DIRECT_URL);
  const supabaseHost = hostnameOf(resolved.NEXT_PUBLIC_SUPABASE_URL);
  const dbName = dbNameOf(resolved.DATABASE_URL);

  if (dbHost === "missing") {
    return {
      kind: "missing",
      allowedForDestructiveTests: false,
      dbHost,
      supabaseHost,
      dbName,
      reason: "DATABASE_URL_missing",
    };
  }

  if (dbHost === "unparseable" || (resolved.DIRECT_URL && directHost === "unparseable")) {
    return {
      kind: "unparseable",
      allowedForDestructiveTests: false,
      dbHost,
      supabaseHost,
      dbName,
      reason: "connection_url_unparseable",
    };
  }

  // Production project identity — deny even if somehow pointed via pooler host alone
  // when Supabase URL or username-style host embeds the project ref.
  const productionSignal =
    isProductionSupabaseHost(supabaseHost) ||
    isProductionSupabaseHost(dbHost) ||
    isProductionSupabaseHost(directHost) ||
    (resolved.DATABASE_URL ?? "").includes(APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF) ||
    (resolved.DIRECT_URL ?? "").includes(APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF) ||
    (resolved.NEXT_PUBLIC_SUPABASE_URL ?? "").includes(APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF);

  if (productionSignal) {
    return {
      kind: "production",
      allowedForDestructiveTests: false,
      dbHost,
      supabaseHost,
      dbName,
      reason: "production_project_denylisted",
    };
  }

  if (isSupabaseHost(dbHost) || isSupabaseHost(directHost) || isSupabaseHost(supabaseHost)) {
    return {
      kind: "supabase_remote",
      allowedForDestructiveTests: false,
      dbHost,
      supabaseHost,
      dbName,
      reason: "supabase_remote_denied",
    };
  }

  const hostsToCheck = [dbHost, ...(resolved.DIRECT_URL ? [directHost] : [])];
  const allLocal = hostsToCheck.every(isSafeLocalHost);
  if (allLocal) {
    // Optional CI marker; localhost alone is sufficient for allow.
    const target = resolved.APPLYFLOW_DB_TARGET?.trim().toLowerCase();
    if (target && target !== "local" && target !== "ephemeral") {
      return {
        kind: "unknown_remote",
        allowedForDestructiveTests: false,
        dbHost,
        supabaseHost,
        dbName,
        reason: "applyflow_db_target_not_allowlisted",
      };
    }
    return {
      kind: "safe_local",
      allowedForDestructiveTests: true,
      dbHost,
      supabaseHost,
      dbName,
      reason: "safe_local_or_ephemeral",
    };
  }

  return {
    kind: "unknown_remote",
    allowedForDestructiveTests: false,
    dbHost,
    supabaseHost,
    dbName,
    reason: "unknown_remote_denied",
  };
}

export class ApplyFlowDestructiveDbTargetDeniedError extends Error {
  readonly classification: ApplyFlowDbTargetClassification;

  constructor(classification: ApplyFlowDbTargetClassification) {
    super(
      `ApplyFlow destructive DB target denied (${classification.kind}: ${classification.reason}).`,
    );
    this.name = "ApplyFlowDestructiveDbTargetDeniedError";
    this.classification = classification;
  }
}

/**
 * Fail-closed gate for any destructive ApplyFlow DB work (fixtures, cleanup, E2E mutate).
 * Call BEFORE the first mutation. Opt-in flags never bypass Production denial.
 */
export function assertApplyFlowDestructiveDbTargetAllowed(
  env?: ApplyFlowDbTargetEnv,
): ApplyFlowDbTargetClassification {
  const classification = classifyApplyFlowDbTarget(env);
  if (!classification.allowedForDestructiveTests) {
    throw new ApplyFlowDestructiveDbTargetDeniedError(classification);
  }
  return classification;
}

/**
 * Narrow options for the pilot operator CLI only.
 * Never wire this into generic destructive scripts — Production stays DENY there.
 */
export type ApplyFlowOperatorMutationTargetOptions = {
  /** Explicit `--production` on this CLI invocation. */
  allowProductionMutation: boolean;
  /**
   * Must equal `computeApplyFlowDbHostFingerprint(classification.dbHost)`.
   * Required when mutating Production; ignored for safe_local.
   */
  productionHostConfirm?: string;
};

export class ApplyFlowOperatorDbTargetDeniedError extends Error {
  readonly classification: ApplyFlowDbTargetClassification;
  readonly code: string;

  constructor(classification: ApplyFlowDbTargetClassification, code: string, message: string) {
    super(message);
    this.name = "ApplyFlowOperatorDbTargetDeniedError";
    this.classification = classification;
    this.code = code;
  }
}

/**
 * Target gate for pilot operator mutations (grant/revoke).
 *
 * - safe_local → ALLOW (and `--production` must NOT be set)
 * - production → ALLOW only with `--production` + matching host fingerprint confirm
 * - everything else → DENY
 *
 * Does NOT weaken `assertApplyFlowDestructiveDbTargetAllowed` (still always denies Production).
 */
export function assertApplyFlowOperatorMutationTargetAllowed(
  env: ApplyFlowDbTargetEnv | undefined,
  options: ApplyFlowOperatorMutationTargetOptions,
): ApplyFlowDbTargetClassification {
  const classification = classifyApplyFlowDbTarget(env);

  if (classification.kind === "safe_local") {
    if (options.allowProductionMutation) {
      throw new ApplyFlowOperatorDbTargetDeniedError(
        classification,
        "production_flag_on_local",
        "ApplyFlow operator: --production is not valid for a safe_local target.",
      );
    }
    return classification;
  }

  if (classification.kind === "production") {
    if (!options.allowProductionMutation) {
      throw new ApplyFlowOperatorDbTargetDeniedError(
        classification,
        "production_requires_explicit_flag",
        "ApplyFlow operator: Production target requires explicit --production on this invocation.",
      );
    }
    const hostFingerprint = computeApplyFlowDbHostFingerprint(classification.dbHost);
    if (!options.productionHostConfirm || options.productionHostConfirm !== hostFingerprint) {
      throw new ApplyFlowOperatorDbTargetDeniedError(
        classification,
        "production_host_confirm_mismatch",
        "ApplyFlow operator: Production mutation requires --confirm-production matching the DB host fingerprint.",
      );
    }
    return classification;
  }

  throw new ApplyFlowOperatorDbTargetDeniedError(
    classification,
    "operator_target_denied",
    `ApplyFlow operator: DB target denied (${classification.kind}: ${classification.reason}).`,
  );
}

/** Sanitized target identity for operator JSON output (never includes credentials). */
export function sanitizeApplyFlowDbTargetForOperator(
  classification: ApplyFlowDbTargetClassification,
): {
  kind: ApplyFlowDbTargetKind;
  reason: string;
  dbHost: string;
  dbName: string;
  hostFingerprint: string;
} {
  return {
    kind: classification.kind,
    reason: classification.reason,
    dbHost: classification.dbHost,
    dbName: classification.dbName,
    hostFingerprint: computeApplyFlowDbHostFingerprint(classification.dbHost),
  };
}

/**
 * @deprecated Use classifyApplyFlowDbTarget / assertApplyFlowDestructiveDbTargetAllowed.
 * Kept as a thin adapter for older call sites during the isolation transition.
 */
export type ApplyFlowDevEnvironmentReport = {
  ok: boolean;
  supabaseHost: string;
  dbHost: string;
  dbName: string;
  persistenceV2: boolean;
  kind: ApplyFlowDbTargetKind;
  reason: string;
  requiredVarNamesPresent: Record<string, boolean>;
};

/** @deprecated Production is denylisted; this never accepts the former "DEV" Supabase project. */
export function assertApplyFlowDedicatedDevEnvironment(
  env?: ApplyFlowDbTargetEnv,
): ApplyFlowDevEnvironmentReport {
  const resolved = resolveEnv(env);
  const classification = classifyApplyFlowDbTarget(resolved);
  return {
    ok: classification.allowedForDestructiveTests,
    supabaseHost: classification.supabaseHost,
    dbHost: classification.dbHost,
    dbName: classification.dbName,
    persistenceV2: resolved.APPLYFLOW_PERSISTENCE_V2 === "true",
    kind: classification.kind,
    reason: classification.reason,
    requiredVarNamesPresent: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(resolved.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Boolean(resolved.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      DATABASE_URL: Boolean(resolved.DATABASE_URL),
      DIRECT_URL: Boolean(resolved.DIRECT_URL),
      APPLYFLOW_PERSISTENCE_V2: Boolean(resolved.APPLYFLOW_PERSISTENCE_V2),
    },
  };
}
