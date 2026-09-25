import type { ApplyFlowApplicationV2Envelope, ApplyFlowJob } from "@devflow/applyflow-core";

import {
  assessDashboardMigrationGate,
  localV1DashboardHasLegacyData,
  noMigrationProof,
  selectDashboardPersistenceMode,
  type ApplyFlowDashboardPersistence,
  type DashboardPersistenceFailureCode,
  type MigrationMarker,
} from "./dashboard-persistence";
import { loadMigrationMarker } from "../migration/migration-marker";
import { prepareMigrationBundle } from "../migration/migration-prepare";
import { createV1DashboardPersistence } from "./v1-local-dashboard-persistence";
import { createV2DashboardPersistence } from "./v2-remote-dashboard-persistence";

export type DashboardPersistenceOpenResult =
  | { kind: "v1"; persistence: ApplyFlowDashboardPersistence }
  | { kind: "migration_required" }
  | { kind: "auth_required"; code: "unauthenticated" | "auth_not_configured" }
  | { kind: "error"; code: "network" | "server" | DashboardPersistenceFailureCode }
  | {
      kind: "ready";
      persistence: ApplyFlowDashboardPersistence;
      jobs: ApplyFlowJob[];
      applications: ApplyFlowApplicationV2Envelope[];
    };

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function failureCode(error: unknown): DashboardPersistenceFailureCode {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code as DashboardPersistenceFailureCode;
  }
  return "network";
}

/**
 * Marker unlocks V2 only when it matches the current logical V1 dataset fingerprint.
 * Stale markers (dataset changed) or unreadable V1 keep migration_required.
 */
function migrationProofFromMarker(accountId: string): MigrationMarker {
  const marker = loadMigrationMarker(accountId);
  if (!marker) return noMigrationProof;
  const prep = prepareMigrationBundle();
  if (!prep.ok) return noMigrationProof;
  if (prep.empty) return { v1ToV2Complete: true };
  if (prep.bundle.fingerprint !== marker.fingerprint) return noMigrationProof;
  return { v1ToV2Complete: true };
}

async function resolveAccountId(fetchImpl: FetchLike): Promise<
  | { ok: true; accountId: string }
  | { ok: false; code: "unauthenticated" | "auth_not_configured" | "network" | "server" }
> {
  try {
    const response = await fetchImpl("/api/applyflow/v2/me", {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (response.status === 401) return { ok: false, code: "unauthenticated" };
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

export async function openDashboardPersistence(input: {
  persistenceV2Enabled: boolean;
  /**
   * Optional override for tests. Production callers omit this so the durable
   * local marker is loaded for the authenticated account.
   */
  migration?: MigrationMarker;
  /** Optional account id when the caller already resolved GET /me. */
  accountId?: string;
  fetchImpl?: typeof fetch;
  legacyData?: boolean;
}): Promise<DashboardPersistenceOpenResult> {
  const mode = selectDashboardPersistenceMode(input.persistenceV2Enabled);
  if (mode === "v1") {
    return { kind: "v1", persistence: createV1DashboardPersistence() };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const legacyData = input.legacyData ?? localV1DashboardHasLegacyData();

  let migration = input.migration;
  if (!migration) {
    if (legacyData) {
      const account =
        input.accountId && input.accountId.trim().length > 0
          ? { ok: true as const, accountId: input.accountId.trim() }
          : await resolveAccountId(fetchImpl);
      if (!account.ok) {
        if (account.code === "unauthenticated" || account.code === "auth_not_configured") {
          return { kind: "auth_required", code: account.code };
        }
        return { kind: "error", code: account.code };
      }
      migration = migrationProofFromMarker(account.accountId);
    } else {
      migration = noMigrationProof;
    }
  }

  const gate = assessDashboardMigrationGate({
    mode,
    legacyData,
    migration,
  });
  if (gate === "migration_required") {
    return { kind: "migration_required" };
  }

  const persistence = createV2DashboardPersistence(fetchImpl);
  try {
    const [jobs, applications] = await Promise.all([persistence.listJobs(), persistence.listApplications()]);
    return { kind: "ready", persistence, jobs, applications };
  } catch (error) {
    const code = failureCode(error);
    if (code === "unauthenticated" || code === "auth_not_configured") {
      return { kind: "auth_required", code };
    }
    return { kind: "error", code };
  }
}
