import type { ApplyFlowApplicationV2Envelope, ApplyFlowJob } from "@devflow/applyflow-core";

import { APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY, loadDashboardJobs } from "@/lib/local-job-storage";
import { APPLYFLOW_DASHBOARD_STORAGE_KEY, loadDashboardImport } from "@/lib/local-import-storage";

/**
 * Mode comes from the server env `APPLYFLOW_PERSISTENCE_V2` passed as a boolean
 * prop by the dashboard server pages. The client does not read that env and
 * does not receive DATABASE_URL, DIRECT_URL, or a second public flag.
 *
 * Extension and JSON import stay on the V1 dashboard boundary. V2 mode blocks
 * those writes instead of storing them only in localStorage.
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
  | "unsupported_in_v2";

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
};

export type MigrationMarker = {
  v1ToV2Complete: boolean;
};

export const noMigrationProof: MigrationMarker = { v1ToV2Complete: false };

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

export function assessDashboardMigrationGate(input: {
  mode: DashboardPersistenceMode;
  legacyData: boolean;
  migration: MigrationMarker;
}): "v1" | "v2_ready" | "migration_required" {
  if (input.mode === "v1") return "v1";
  if (input.legacyData && !input.migration.v1ToV2Complete) return "migration_required";
  return "v2_ready";
}
