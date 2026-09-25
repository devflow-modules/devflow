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

function failureCode(error: unknown): DashboardPersistenceFailureCode {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code as DashboardPersistenceFailureCode;
  }
  return "network";
}

export async function openDashboardPersistence(input: {
  persistenceV2Enabled: boolean;
  migration?: MigrationMarker;
  fetchImpl?: typeof fetch;
  legacyData?: boolean;
}): Promise<DashboardPersistenceOpenResult> {
  const mode = selectDashboardPersistenceMode(input.persistenceV2Enabled);
  if (mode === "v1") {
    return { kind: "v1", persistence: createV1DashboardPersistence() };
  }

  const legacyData = input.legacyData ?? localV1DashboardHasLegacyData();
  const gate = assessDashboardMigrationGate({
    mode,
    legacyData,
    migration: input.migration ?? noMigrationProof,
  });
  if (gate === "migration_required") {
    return { kind: "migration_required" };
  }

  const persistence = createV2DashboardPersistence(input.fetchImpl);
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
