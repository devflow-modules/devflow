import type { ApplyFlowApplicationV2Envelope, ApplyFlowJob } from "@devflow/applyflow-core";

import { APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY, loadDashboardJobs } from "@/lib/local-job-storage";
import { APPLYFLOW_DASHBOARD_STORAGE_KEY, loadDashboardImport } from "@/lib/local-import-storage";

/**
 * Adapter backend kind. Authoritative *account* mode comes from
 * ApplyFlowClientPersistenceBootstrap (server-resolved), not from a global
 * boolean prop. Adapter mode here only labels V1 localStorage vs V2 API.
 *
 * Extension and JSON import stay on the V1 dashboard boundary. Cloud modes
 * block those writes instead of storing them only in localStorage.
 * There is no storage-event listener in the current dashboard, so neither
 * adapter invents cross-tab sync.
 */
export type DashboardPersistenceMode = "v1" | "v2";

export type DashboardPersistenceFailureCode =
  | "unauthenticated"
  | "auth_not_configured"
  | "network"
  | "server"
  | "not_found"
  | "version_conflict"
  | "job_already_exists"
  | "application_already_exists"
  | "application_already_exists_for_job"
  | "invalid_status_transition"
  | "unsupported_in_v2"
  | "read_only";

export type DashboardPersistenceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: DashboardPersistenceFailureCode };

export type DashboardJobMerge = {
  jobs: ApplyFlowJob[];
  added: number;
  skipped: number;
};

export type ApplyFlowDashboardPersistence = {
  readonly mode: DashboardPersistenceMode;
  listJobs(): Promise<ApplyFlowJob[]>;
  mergeJobs(current: readonly ApplyFlowJob[], incoming: readonly ApplyFlowJob[]): Promise<DashboardPersistenceResult<DashboardJobMerge>>;
  createJob(job: ApplyFlowJob): Promise<DashboardPersistenceResult<ApplyFlowJob>>;
  updateJob(job: ApplyFlowJob): Promise<DashboardPersistenceResult<ApplyFlowJob>>;
  listApplications(): Promise<ApplyFlowApplicationV2Envelope[]>;
  createApplication(
    application: ApplyFlowApplicationV2Envelope,
  ): Promise<DashboardPersistenceResult<ApplyFlowApplicationV2Envelope>>;
  updateApplication(
    application: ApplyFlowApplicationV2Envelope,
  ): Promise<DashboardPersistenceResult<ApplyFlowApplicationV2Envelope>>;
  replaceApplications(
    applications: readonly ApplyFlowApplicationV2Envelope[],
  ): Promise<DashboardPersistenceResult<ApplyFlowApplicationV2Envelope[]>>;
  /**
   * Optional atomic Application + linked Job lifecycle transition (V2 cloud).
   * When present, prefer over separate updateApplication + updateJob.
   */
  transitionApplicationLifecycle?(input: {
    application: ApplyFlowApplicationV2Envelope;
    status: ApplyFlowApplicationV2Envelope["status"];
    notes?: string;
  }): Promise<
    DashboardPersistenceResult<{
      application: ApplyFlowApplicationV2Envelope;
      job: ApplyFlowJob | null;
      jobSynced: boolean;
    }>
  >;
};

export type MigrationMarker = {
  v1ToV2Complete: boolean;
};

export const noMigrationProof: MigrationMarker = { v1ToV2Complete: false };

/**
 * @deprecated R2.2.4 — client must not select adapters from a global boolean.
 * Kept only for transitional unit tests of the old boolean matrix.
 */
export function selectDashboardPersistenceMode(persistenceV2Enabled: boolean): DashboardPersistenceMode {
  return persistenceV2Enabled ? "v2" : "v1";
}

export function localV1DashboardHasLegacyData(): boolean {
  if (typeof window === "undefined") return false;
  const jobs = loadDashboardJobs();
  if (jobs.status === "unreadable" || jobs.status === "partial" || jobs.jobs.length > 0) return true;
  const imported = loadDashboardImport();
  if (imported && imported.applications.length > 0) return true;
  const rawApplications = window.localStorage.getItem(APPLYFLOW_DASHBOARD_STORAGE_KEY);
  if (rawApplications && !imported) return true;
  const rawJobs = window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY);
  if (rawJobs && jobs.status === "empty") return false;
  return false;
}

/**
 * Offering-only migration gate. Marker proves UX/recovery evidence only —
 * it never upgrades the client to v2_active while server mode is v2_offering.
 */
export function assessOfferingMigrationGate(input: {
  legacyData: boolean;
  migration: MigrationMarker;
}): "v1_local" | "migration_required" | "migration_complete_pending_activation" {
  if (!input.legacyData) return "v1_local";
  if (!input.migration.v1ToV2Complete) return "migration_required";
  // Until R2.2.5 canonical transition: stay on V1 even with a completed marker.
  return "migration_complete_pending_activation";
}

/**
 * @deprecated Prefer assessOfferingMigrationGate with server mode v2_offering.
 * Legacy boolean-mode gate used by older tests.
 */
export function assessDashboardMigrationGate(input: {
  mode: DashboardPersistenceMode;
  legacyData: boolean;
  migration: MigrationMarker;
}): "v1" | "v2_ready" | "migration_required" {
  if (input.mode === "v1") return "v1";
  if (input.legacyData && !input.migration.v1ToV2Complete) return "migration_required";
  return "v2_ready";
}
