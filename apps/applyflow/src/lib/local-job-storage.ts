import { parseStoredApplyFlowJob, type ApplyFlowJob } from "@devflow/applyflow-core";

export const APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY = "APPLYFLOW_DASHBOARD_JOBS_V1" as const;
export const DASHBOARD_JOBS_STORAGE_VERSION = 1 as const;

export type DashboardStoredJobs = {
  version: typeof DASHBOARD_JOBS_STORAGE_VERSION;
  savedAt: string;
  jobs: ApplyFlowJob[];
};

export type DashboardJobsLoadStatus = "empty" | "ok" | "partial" | "unreadable";
export type DashboardJobsUnreadableReason = "malformed-json" | "unknown-version" | "invalid-envelope";

export type DashboardJobsLoadResult = {
  jobs: ApplyFlowJob[];
  status: DashboardJobsLoadStatus;
  ignoredCount: number;
  reason?: DashboardJobsUnreadableReason;
};

function emptyResult(): DashboardJobsLoadResult {
  return { jobs: [], status: "empty", ignoredCount: 0 };
}

function unreadable(reason: DashboardJobsUnreadableReason): DashboardJobsLoadResult {
  return { jobs: [], status: "unreadable", ignoredCount: 0, reason };
}

export function loadDashboardJobs(): DashboardJobsLoadResult {
  if (typeof window === "undefined") return emptyResult();
  const raw = window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY);
  if (!raw) return emptyResult();

  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return unreadable("malformed-json");
  }

  if (!data || typeof data !== "object") {
    return unreadable("invalid-envelope");
  }

  const doc = data as { version?: unknown; jobs?: unknown };
  if (doc.version !== DASHBOARD_JOBS_STORAGE_VERSION) {
    return unreadable("unknown-version");
  }
  if (!Array.isArray(doc.jobs)) {
    return unreadable("invalid-envelope");
  }

  const jobs: ApplyFlowJob[] = [];
  let ignoredCount = 0;
  for (const item of doc.jobs) {
    const parsed = parseStoredApplyFlowJob(item);
    if (parsed) jobs.push(parsed);
    else ignoredCount += 1;
  }

  if (ignoredCount > 0) {
    return { jobs, status: "partial", ignoredCount };
  }
  return { jobs, status: "ok", ignoredCount: 0 };
}

export function persistDashboardJobs(jobs: ApplyFlowJob[]): void {
  if (typeof window === "undefined") return;
  const doc: DashboardStoredJobs = {
    version: DASHBOARD_JOBS_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    jobs,
  };
  window.localStorage.setItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY, JSON.stringify(doc));
}

export function clearPersistedDashboardJobs(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY);
}
