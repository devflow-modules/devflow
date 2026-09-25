import {
  parseStoredApplyFlowJob,
  type ApplyFlowApplicationV2Envelope,
  type ApplyFlowJob,
} from "@devflow/applyflow-core";

import type { ApplicationResponse } from "../applications/application-dto";
import type { JobResponse } from "../jobs/job-dto";
import type {
  ApplyFlowDashboardPersistence,
  DashboardPersistenceFailureCode,
  DashboardPersistenceResult,
} from "./dashboard-persistence";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const JOBS_PATH = "/api/applyflow/v2/jobs";
const APPLICATIONS_PATH = "/api/applyflow/v2/applications";

function failure(code: DashboardPersistenceFailureCode): { ok: false; code: DashboardPersistenceFailureCode } {
  return { ok: false, code };
}

function definedRecord(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry != null));
}

function jobToBody(job: ApplyFlowJob, includeId: boolean): Record<string, unknown> {
  return definedRecord({
    ...(includeId ? { id: job.id } : {}),
    title: job.title,
    company: job.company,
    location: job.location,
    url: job.url,
    source: job.source,
    status: job.status,
    jobContext: job.jobContext,
    descriptionSnapshot: job.descriptionSnapshot,
    jobMatch: job.jobMatch,
    evaluatedWith: job.evaluatedWith,
    curriculumRecommendation: job.curriculumRecommendation,
    applicationPack: job.applicationPack,
  });
}

function applicationToBody(application: ApplyFlowApplicationV2Envelope, includeIdentity: boolean): Record<string, unknown> {
  const { sourceJobId, ...v2Meta } = application.v2 ?? {};
  return definedRecord({
    ...(includeIdentity ? { id: application.id } : {}),
    source: application.source,
    status: application.status,
    ...(includeIdentity ? { sourceJobId: sourceJobId ?? null } : {}),
    jobTitle: application.jobTitle,
    companyName: application.companyName,
    jobUrl: application.jobUrl,
    fitScore: application.fitScore,
    notes: application.notes,
    jobMeta: application.jobMeta,
    v2Meta: Object.keys(v2Meta).length > 0 ? v2Meta : undefined,
    extras: definedRecord({
      fieldsDetected: application.fieldsDetected,
      fieldsFilled: application.fieldsFilled,
      blockedCount: application.blockedCount,
      failedCount: application.failedCount,
      matchDecision: application.matchDecision,
      resumeTrack: application.resumeTrack,
      strengthsSummary: application.strengthsSummary,
      gapsSummary: application.gapsSummary,
      preparationStatus: application.preparationStatus,
    }),
  });
}

export function jobFromResponse(row: JobResponse): ApplyFlowJob | null {
  return parseStoredApplyFlowJob({
    id: row.id,
    title: row.title,
    company: row.company ?? undefined,
    location: row.location ?? undefined,
    url: row.url ?? undefined,
    source: row.source,
    status: row.status,
    jobContext: row.jobContext,
    descriptionSnapshot: row.descriptionSnapshot ?? undefined,
    descriptionHash: row.descriptionHash ?? undefined,
    jobMatch: row.jobMatch,
    evaluatedWith: row.evaluatedWith ?? undefined,
    curriculumRecommendation: row.curriculumRecommendation ?? undefined,
    applicationPack: row.applicationPack ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function applicationFromResponse(row: ApplicationResponse): ApplyFlowApplicationV2Envelope {
  const extras = row.extras ?? {};
  const v2Meta = row.v2Meta ?? {};
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    source: row.source,
    status: row.status,
    ...(row.jobTitle ? { jobTitle: row.jobTitle } : {}),
    ...(row.companyName ? { companyName: row.companyName } : {}),
    ...(row.jobUrl ? { jobUrl: row.jobUrl } : {}),
    ...(row.fitScore != null ? { fitScore: row.fitScore } : {}),
    ...(row.notes ? { notes: row.notes } : {}),
    ...(row.jobMeta ? { jobMeta: row.jobMeta } : {}),
    ...(extras.fieldsDetected != null ? { fieldsDetected: extras.fieldsDetected } : {}),
    ...(extras.fieldsFilled != null ? { fieldsFilled: extras.fieldsFilled } : {}),
    ...(extras.blockedCount != null ? { blockedCount: extras.blockedCount } : {}),
    ...(extras.failedCount != null ? { failedCount: extras.failedCount } : {}),
    ...(extras.matchDecision ? { matchDecision: extras.matchDecision } : {}),
    ...(extras.resumeTrack ? { resumeTrack: extras.resumeTrack } : {}),
    ...(extras.strengthsSummary ? { strengthsSummary: extras.strengthsSummary } : {}),
    ...(extras.gapsSummary ? { gapsSummary: extras.gapsSummary } : {}),
    ...(extras.preparationStatus ? { preparationStatus: extras.preparationStatus } : {}),
    v2: {
      ...v2Meta,
      ...(row.sourceJobId ? { sourceJobId: row.sourceJobId } : {}),
    },
  };
}

function codeForResponse(status: number, error: string | undefined): DashboardPersistenceFailureCode {
  if (status === 401) return "unauthenticated";
  if (status === 503 && error === "auth_not_configured") return "auth_not_configured";
  if (status === 409) {
    if (error === "job_already_exists") return "job_already_exists";
    if (error === "application_already_exists") return "application_already_exists";
    if (error === "application_already_exists_for_job") return "application_already_exists_for_job";
    return "version_conflict";
  }
  if (status === 400 && error === "invalid_status_transition") return "invalid_status_transition";
  if (status === 404) return "not_found";
  return "server";
}

export function createV2DashboardPersistence(fetchImpl: FetchLike = fetch): ApplyFlowDashboardPersistence {
  const jobVersions = new Map<string, number>();
  const applicationVersions = new Map<string, number>();

  function rememberJob(row: JobResponse, job: ApplyFlowJob): ApplyFlowJob {
    jobVersions.set(job.id, row.version);
    return job;
  }

  function rememberApplication(row: ApplicationResponse, application: ApplyFlowApplicationV2Envelope) {
    applicationVersions.set(application.id, row.version);
    return application;
  }

  async function send(path: string, init: RequestInit): Promise<
    | { ok: true; status: number; body: unknown }
    | { ok: false; code: DashboardPersistenceFailureCode }
  > {
    let response: Response;
    try {
      response = await fetchImpl(path, {
        ...init,
        credentials: "same-origin",
        headers: {
          accept: "application/json",
          ...(init.body ? { "content-type": "application/json" } : {}),
          ...init.headers,
        },
      });
    } catch {
      return failure("network");
    }
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    if (!response.ok) {
      const error = body && typeof body === "object" && "error" in body ? String((body as { error?: unknown }).error) : undefined;
      return failure(codeForResponse(response.status, error));
    }
    return { ok: true, status: response.status, body };
  }

  async function currentJobVersion(id: string): Promise<number | DashboardPersistenceFailureCode> {
    const known = jobVersions.get(id);
    if (known) return known;
    const loaded = await send(`${JOBS_PATH}/${encodeURIComponent(id)}`, { method: "GET" });
    if (!loaded.ok) return loaded.code;
    const row = loaded.body as JobResponse;
    const job = jobFromResponse(row);
    if (!job) return "server";
    rememberJob(row, job);
    return row.version;
  }

  async function currentApplicationVersion(id: string): Promise<number | DashboardPersistenceFailureCode> {
    const known = applicationVersions.get(id);
    if (known) return known;
    const loaded = await send(`${APPLICATIONS_PATH}/${encodeURIComponent(id)}`, { method: "GET" });
    if (!loaded.ok) return loaded.code;
    const row = loaded.body as ApplicationResponse;
    rememberApplication(row, applicationFromResponse(row));
    return row.version;
  }

  async function createJob(job: ApplyFlowJob): Promise<DashboardPersistenceResult<ApplyFlowJob>> {
    const created = await send(JOBS_PATH, { method: "POST", body: JSON.stringify(jobToBody(job, true)) });
    if (!created.ok) return created;
    const row = created.body as JobResponse;
    const parsed = jobFromResponse(row);
    if (!parsed) return failure("server");
    return { ok: true, data: rememberJob(row, parsed) };
  }

  return {
    mode: "v2",
    async listJobs() {
      const loaded = await send(JOBS_PATH, { method: "GET" });
      if (!loaded.ok) throw Object.assign(new Error(loaded.code), { code: loaded.code });
      const rows = (loaded.body as { jobs?: JobResponse[] }).jobs ?? [];
      const jobs: ApplyFlowJob[] = [];
      for (const row of rows) {
        const job = jobFromResponse(row);
        if (!job) throw Object.assign(new Error("server"), { code: "server" });
        jobs.push(rememberJob(row, job));
      }
      return jobs;
    },
    async mergeJobs(_current, incoming) {
      const jobs: ApplyFlowJob[] = [];
      let added = 0;
      let skipped = 0;
      for (const job of incoming) {
        const created = await createJob(job);
        if (!created.ok) {
          if (created.code === "job_already_exists") {
            skipped += 1;
            continue;
          }
          return created;
        }
        jobs.push(created.data);
        added += 1;
      }
      return { ok: true, data: { jobs, added, skipped } };
    },
    createJob,
    async updateJob(job) {
      const version = await currentJobVersion(job.id);
      if (typeof version !== "number") return failure(version);
      const patched = await send(`${JOBS_PATH}/${encodeURIComponent(job.id)}`, {
        method: "PATCH",
        headers: { "if-match": `"${version}"` },
        body: JSON.stringify(jobToBody(job, false)),
      });
      if (!patched.ok) return patched;
      const row = patched.body as JobResponse;
      const parsed = jobFromResponse(row);
      if (!parsed) return failure("server");
      return { ok: true, data: rememberJob(row, parsed) };
    },
    async listApplications() {
      const loaded = await send(APPLICATIONS_PATH, { method: "GET" });
      if (!loaded.ok) throw Object.assign(new Error(loaded.code), { code: loaded.code });
      const rows = (loaded.body as { applications?: ApplicationResponse[] }).applications ?? [];
      return rows.map((row) => rememberApplication(row, applicationFromResponse(row)));
    },
    async createApplication(application) {
      const body = applicationToBody(application, true);
      if (body.extras && typeof body.extras === "object" && Object.keys(body.extras).length === 0) {
        delete body.extras;
      }
      const created = await send(APPLICATIONS_PATH, { method: "POST", body: JSON.stringify(body) });
      if (!created.ok) return created;
      const row = created.body as ApplicationResponse;
      return { ok: true, data: rememberApplication(row, applicationFromResponse(row)) };
    },
    async updateApplication(application) {
      const version = await currentApplicationVersion(application.id);
      if (typeof version !== "number") return failure(version);
      const body = applicationToBody(application, false);
      delete body.extras;
      delete body.v2Meta;
      delete body.jobMeta;
      const patched = await send(`${APPLICATIONS_PATH}/${encodeURIComponent(application.id)}`, {
        method: "PATCH",
        headers: { "if-match": `"${version}"` },
        body: JSON.stringify(body),
      });
      if (!patched.ok) return patched;
      const row = patched.body as ApplicationResponse;
      return { ok: true, data: rememberApplication(row, applicationFromResponse(row)) };
    },
    async replaceApplications() {
      return failure("unsupported_in_v2");
    },
  };
}
