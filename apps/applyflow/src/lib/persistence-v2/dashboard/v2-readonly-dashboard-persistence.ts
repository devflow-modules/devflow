import type {
  ApplyFlowDashboardPersistence,
  DashboardPersistenceResult,
} from "./dashboard-persistence";

function readOnlyDeny<T>(): DashboardPersistenceResult<T> {
  return { ok: false, code: "read_only" };
}

/**
 * Defense-in-depth read-only wrapper around the V2 cloud adapter.
 * Server still returns 403 on writes; client must not fake local success.
 */
export function createReadOnlyV2DashboardPersistence(
  inner: ApplyFlowDashboardPersistence,
): ApplyFlowDashboardPersistence {
  return {
    mode: "v2",
    listJobs: () => inner.listJobs(),
    listApplications: () => inner.listApplications(),
    mergeJobs: async () => readOnlyDeny(),
    createJob: async () => readOnlyDeny(),
    updateJob: async () => readOnlyDeny(),
    createApplication: async () => readOnlyDeny(),
    updateApplication: async () => readOnlyDeny(),
    replaceApplications: async () => readOnlyDeny(),
    transitionApplicationLifecycle: async () => readOnlyDeny(),
  };
}
