import type { MigrationCompletionProof, MigrationImportBody } from "./migration-dto";
import { fingerprintApplyFlowAccountId } from "./migration-fingerprint";
import {
  loadMigrationMarker,
  persistMigrationMarker,
  type MigrationMarkerRecord,
} from "./migration-marker";
import { prepareMigrationBundle, type MigrationPrepareResult } from "./migration-prepare";

export type MigrationCoordinatorState =
  | "idle"
  | "preparing"
  | "migrating"
  | "completed"
  | "failed";

export type MigrationCoordinatorErrorCode =
  | "auth_required"
  | "legacy_unreadable"
  | "legacy_partial_or_malformed"
  | "duplicate_id"
  | "migration_dataset_too_large"
  | "migration_api_failed"
  | "migration_conflict"
  | "completion_proof_invalid"
  | "marker_write_failed"
  | "network"
  | "server"
  | "auth_not_configured";

export type MigrationCoordinatorFailure = {
  ok: false;
  state: "failed";
  code: MigrationCoordinatorErrorCode;
  detail?: string;
  conflicts?: Array<{ entityType: string; entityId: string; reason: string }>;
};

export type MigrationCoordinatorSuccess = {
  ok: true;
  state: "completed";
  proof: MigrationCompletionProof;
  marker: MigrationMarkerRecord;
  bundle: MigrationImportBody;
};

export type MigrationCoordinatorResult = MigrationCoordinatorSuccess | MigrationCoordinatorFailure;

export type MigrationCoordinatorEmpty = {
  ok: true;
  state: "completed";
  empty: true;
};

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * POST completion proof is authoritative for F3.2.
 * An extra GET /migration/:sessionId is not required for the happy path;
 * retries rely on identical fingerprint → same completed session.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateMigrationCompletionProof(
  raw: unknown,
  expected: MigrationImportBody,
): MigrationCompletionProof | null {
  if (!isRecord(raw)) return null;
  if (raw.status !== "completed") return null;
  if (typeof raw.sessionId !== "string" || raw.sessionId.trim().length === 0) return null;
  if (typeof raw.fingerprint !== "string" || raw.fingerprint !== expected.fingerprint) return null;
  if (raw.sourceVersion !== 1) return null;
  if (raw.expectedJobs !== expected.jobs.length) return null;
  if (raw.expectedApplications !== expected.applications.length) return null;
  if (raw.processedJobs !== expected.jobs.length) return null;
  if (raw.processedApplications !== expected.applications.length) return null;
  if (typeof raw.completedAt !== "string" || !Number.isFinite(Date.parse(raw.completedAt))) {
    return null;
  }
  return {
    sessionId: raw.sessionId.trim(),
    status: "completed",
    fingerprint: raw.fingerprint,
    sourceVersion: 1,
    expectedJobs: raw.expectedJobs as number,
    expectedApplications: raw.expectedApplications as number,
    processedJobs: raw.processedJobs as number,
    processedApplications: raw.processedApplications as number,
    completedAt: raw.completedAt,
  };
}

async function resolveAccountId(fetchImpl: FetchLike): Promise<
  | { ok: true; accountId: string }
  | { ok: false; code: "auth_required" | "auth_not_configured" | "network" | "server" }
> {
  try {
    const response = await fetchImpl("/api/applyflow/v2/me", {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (response.status === 401) return { ok: false, code: "auth_required" };
    if (response.status === 503) return { ok: false, code: "auth_not_configured" };
    if (!response.ok) return { ok: false, code: "server" };
    const body = (await response.json().catch(() => null)) as { account?: { id?: string } } | null;
    const accountId = body?.account?.id;
    if (typeof accountId !== "string" || accountId.trim().length === 0) {
      return { ok: false, code: "server" };
    }
    return { ok: true, accountId: accountId.trim() };
  } catch {
    return { ok: false, code: "network" };
  }
}

function mapPrepareFailure(prep: Extract<MigrationPrepareResult, { ok: false }>): MigrationCoordinatorFailure {
  return {
    ok: false,
    state: "failed",
    code: prep.code,
    detail: prep.detail,
  };
}

function writeMarkerAfterProof(
  accountId: string,
  proof: MigrationCompletionProof,
): MigrationMarkerRecord | null {
  const marker: MigrationMarkerRecord = {
    version: 1,
    v1ToV2Complete: true,
    accountIdFingerprint: fingerprintApplyFlowAccountId(accountId),
    sessionId: proof.sessionId,
    completedAt: proof.completedAt,
    fingerprint: proof.fingerprint,
  };
  try {
    persistMigrationMarker(marker);
    const loaded = loadMigrationMarker(accountId);
    if (
      !loaded ||
      loaded.sessionId !== marker.sessionId ||
      loaded.fingerprint !== marker.fingerprint ||
      loaded.v1ToV2Complete !== true
    ) {
      return null;
    }
    return loaded;
  } catch {
    return null;
  }
}

async function postMigrationBundle(
  fetchImpl: FetchLike,
  bundle: MigrationImportBody,
): Promise<
  | { ok: true; body: unknown }
  | { ok: false; code: MigrationCoordinatorErrorCode; detail?: string; conflicts?: MigrationCoordinatorFailure["conflicts"] }
> {
  try {
    const response = await fetchImpl("/api/applyflow/v2/migration", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bundle),
    });
    const body = await response.json().catch(() => null);
    if (response.status === 401) return { ok: false, code: "auth_required" };
    if (response.status === 503) return { ok: false, code: "auth_not_configured" };
    if (response.status === 409) {
      return {
        ok: false,
        code: "migration_conflict",
        conflicts: isRecord(body) && Array.isArray(body.conflicts) ? body.conflicts : undefined,
      };
    }
    if (!response.ok) {
      const error =
        isRecord(body) && typeof body.error === "string" ? body.error : "migration_api_failed";
      if (error === "migration_fingerprint_mismatch") {
        return { ok: false, code: "migration_api_failed", detail: error };
      }
      if (error === "payload_too_large") {
        return { ok: false, code: "migration_dataset_too_large" };
      }
      return { ok: false, code: "migration_api_failed", detail: error };
    }
    return { ok: true, body };
  } catch {
    return { ok: false, code: "network" };
  }
}

/**
 * Read/normalize V1 into the F3.2 bundle without submitting.
 */
export function prepareMigration(): MigrationPrepareResult {
  return prepareMigrationBundle();
}

/**
 * Execute V1→V2 migration: prepare → POST → validate proof → persist marker.
 * Never deletes or rewrites V1 Jobs/Applications/Analytics storage.
 */
export async function runMigration(input?: {
  fetchImpl?: FetchLike;
  accountId?: string;
}): Promise<MigrationCoordinatorResult | MigrationCoordinatorEmpty> {
  const fetchImpl = input?.fetchImpl ?? fetch;

  const account =
    input?.accountId && input.accountId.trim().length > 0
      ? { ok: true as const, accountId: input.accountId.trim() }
      : await resolveAccountId(fetchImpl);
  if (!account.ok) {
    return { ok: false, state: "failed", code: account.code === "auth_required" ? "auth_required" : account.code };
  }

  const prep = prepareMigrationBundle();
  if (!prep.ok) return mapPrepareFailure(prep);
  if (prep.empty) {
    return { ok: true, state: "completed", empty: true };
  }

  const existing = loadMigrationMarker(account.accountId);
  if (existing && existing.fingerprint === prep.bundle.fingerprint) {
    return {
      ok: true,
      state: "completed",
      proof: {
        sessionId: existing.sessionId,
        status: "completed",
        fingerprint: existing.fingerprint,
        sourceVersion: 1,
        expectedJobs: prep.bundle.jobs.length,
        expectedApplications: prep.bundle.applications.length,
        processedJobs: prep.bundle.jobs.length,
        processedApplications: prep.bundle.applications.length,
        completedAt: existing.completedAt,
      },
      marker: existing,
      bundle: prep.bundle,
    };
  }

  const posted = await postMigrationBundle(fetchImpl, prep.bundle);
  if (!posted.ok) {
    return {
      ok: false,
      state: "failed",
      code: posted.code,
      detail: posted.detail,
      conflicts: posted.conflicts,
    };
  }

  const proof = validateMigrationCompletionProof(posted.body, prep.bundle);
  if (!proof) {
    return { ok: false, state: "failed", code: "completion_proof_invalid" };
  }

  const marker = writeMarkerAfterProof(account.accountId, proof);
  if (!marker) {
    return { ok: false, state: "failed", code: "marker_write_failed", detail: proof.sessionId };
  }

  return { ok: true, state: "completed", proof, marker, bundle: prep.bundle };
}

/**
 * Resume/retry after crash windows B–E.
 * Rebuilds the same logical bundle from unchanged V1 and reuses F3.2 session.
 */
export async function resumeMigration(input?: {
  fetchImpl?: FetchLike;
  accountId?: string;
}): Promise<MigrationCoordinatorResult | MigrationCoordinatorEmpty> {
  return runMigration(input);
}
