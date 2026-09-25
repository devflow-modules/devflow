import { mergeApplyFlowJobs, replaceApplyFlowJob, type ApplyFlowApplicationV2Envelope } from "@devflow/applyflow-core";

import { loadDashboardImport, persistDashboardImport, upsertDashboardApplication } from "@/lib/local-import-storage";
import { loadDashboardJobs, persistDashboardJobs } from "@/lib/local-job-storage";

import type {
  ApplyFlowDashboardPersistence,
  DashboardPersistenceResult,
} from "./dashboard-persistence";

function ok<T>(data: T): DashboardPersistenceResult<T> {
  return { ok: true, data };
}

export function createV1DashboardPersistence(): ApplyFlowDashboardPersistence {
  return {
    mode: "v1",
    async listJobs() {
      return loadDashboardJobs().jobs;
    },
    async mergeJobs(current, incoming) {
      const merged = mergeApplyFlowJobs([...current], [...incoming]);
      persistDashboardJobs(merged.jobs);
      return ok(merged);
    },
    async createJob(job) {
      const merged = mergeApplyFlowJobs(loadDashboardJobs().jobs, [job]);
      if (merged.added === 0) return { ok: false, code: "job_already_exists" };
      persistDashboardJobs(merged.jobs);
      return ok(merged.jobs.find((item) => item.id === job.id) ?? job);
    },
    async updateJob(job) {
      const next = replaceApplyFlowJob(loadDashboardJobs().jobs, job);
      persistDashboardJobs(next);
      return ok(next.find((item) => item.id === job.id) ?? job);
    },
    async listApplications() {
      return (loadDashboardImport()?.applications ?? []) as ApplyFlowApplicationV2Envelope[];
    },
    async createApplication(application) {
      upsertDashboardApplication(application);
      return ok(application);
    },
    async updateApplication(application) {
      upsertDashboardApplication(application);
      return ok(application);
    },
    async replaceApplications(applications) {
      const next = [...applications] as ApplyFlowApplicationV2Envelope[];
      persistDashboardImport(next);
      return ok(next);
    },
  };
}
