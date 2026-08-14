import type { ApplyFlowJob } from "@devflow/applyflow-core";

export const APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY = "APPLYFLOW_DASHBOARD_JOBS_V1" as const;

export type DashboardStoredJobs = {
  version: 1;
  savedAt: string;
  jobs: ApplyFlowJob[];
};

export function loadDashboardJobs(): ApplyFlowJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (
      !data ||
      typeof data !== "object" ||
      (data as DashboardStoredJobs).version !== 1 ||
      !Array.isArray((data as DashboardStoredJobs).jobs)
    ) {
      return [];
    }
    return (data as DashboardStoredJobs).jobs;
  } catch {
    return [];
  }
}

export function persistDashboardJobs(jobs: ApplyFlowJob[]): void {
  if (typeof window === "undefined") return;
  const doc: DashboardStoredJobs = {
    version: 1,
    savedAt: new Date().toISOString(),
    jobs,
  };
  window.localStorage.setItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY, JSON.stringify(doc));
}

export function clearPersistedDashboardJobs(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY);
}
