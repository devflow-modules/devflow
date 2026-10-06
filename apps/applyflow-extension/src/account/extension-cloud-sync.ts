import {
  JOB_MATCH_SCORING_VERSION,
  getDefaultResumeVariant,
  type CandidateProfile,
  type ResumeLibrary,
  type SaveApplicationInput,
} from "@devflow/applyflow-core";

import { extensionApiFetch, type ExtensionApiResult } from "./extension-api-client.js";

export type AccountProfileSnapshot = {
  accountId: string;
  generation: number;
  library: ResumeLibrary;
  selectedVariantId: string;
  profile: CandidateProfile;
};

export type RegisterCloudResult =
  | {
      ok: true;
      jobId: string;
      applicationId: string;
      applicationVersion: number;
      reused: boolean;
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

type JobRow = {
  id: string;
  url?: string | null;
  title?: string;
  version?: number;
};

type ApplicationRow = {
  id: string;
  version: number;
  sourceJobId?: string | null;
  jobUrl?: string | null;
  status?: string | null;
};

const DUPLICATE_JOB = "job_already_exists";
const DUPLICATE_APP = "application_already_exists";
const DUPLICATE_APP_FOR_JOB = "application_already_exists_for_job";
const VERSION_CONFLICT = "version_conflict";

export function classifyHttp409(error: string): "duplicate_job" | "duplicate_application" | "version_conflict" | "unknown" {
  if (error === DUPLICATE_JOB) return "duplicate_job";
  if (error === DUPLICATE_APP || error === DUPLICATE_APP_FOR_JOB) return "duplicate_application";
  if (error === VERSION_CONFLICT) return "version_conflict";
  return "unknown";
}

function stableId(prefix: string, seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `${prefix}_${hash.toString(16).padStart(8, "0")}_${seed.length.toString(16)}`;
}

export function exportStableCloudIds(accountId: string, jobUrl: string): { jobId: string; applicationId: string } {
  return {
    jobId: stableId("extjob", `${accountId}:${jobUrl}`),
    applicationId: stableId("extapp", `${accountId}:${jobUrl}`),
  };
}

function normalizeUrl(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, "").toLowerCase();
  }
}

function urlsCompatible(expected: string, actual: string | null | undefined): boolean {
  if (!actual) return true;
  return normalizeUrl(expected) === normalizeUrl(actual);
}

export function pickAccountProfile(
  library: ResumeLibrary,
  preferredVariantId?: string | null,
): { selectedVariantId: string; profile: CandidateProfile } | null {
  if (!library.variants?.length) return null;
  const preferred = preferredVariantId
    ? library.variants.find((variant) => variant.id === preferredVariantId)
    : undefined;
  try {
    const variant = preferred ?? getDefaultResumeVariant(library);
    return { selectedVariantId: variant.id, profile: variant.profile };
  } catch {
    return null;
  }
}

/** Fields safe to send to the LinkedIn content script — never the full library JSON. */
export function profileFieldsForContentScript(profile: CandidateProfile): CandidateProfile {
  return profile;
}

export async function loadAccountResumeLibrary(input: {
  origin: string;
  token: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<
  | { ok: true; library: ResumeLibrary; version: number | null }
  | { ok: false; error: string; status: number }
> {
  const result = await extensionApiFetch<{
    profile?: { library?: ResumeLibrary; version?: number } | null;
  }>({
    origin: input.origin,
    token: input.token,
    path: "/api/applyflow/v2/profile",
    signal: input.signal,
    fetchImpl: input.fetchImpl,
  });
  if (!result.ok) return { ok: false, error: result.error, status: result.status };
  const library = result.body.profile?.library;
  if (!library?.variants?.length) {
    return { ok: false, error: "profile_empty", status: 404 };
  }
  return {
    ok: true,
    library,
    version: typeof result.body.profile?.version === "number" ? result.body.profile.version : null,
  };
}

function jobMatchFromDraft(draft: SaveApplicationInput) {
  const raw = draft.matchDecision;
  const decision =
    raw === "apply" || raw === "needs_info" || raw === "skip"
      ? raw
      : raw === "review"
        ? "needs_info"
        : "needs_info";
  return {
    score: typeof draft.fitScore === "number" ? Math.max(0, Math.min(100, draft.fitScore)) : 0,
    decision,
    matchedSkills: [],
    missingSkills: [],
    evaluatedAt: new Date().toISOString(),
    scoringVersion: JOB_MATCH_SCORING_VERSION,
  };
}

function fail(error: string, status: number): RegisterCloudResult {
  return { ok: false, error, status };
}

async function fetchJobById(input: {
  origin: string;
  token: string;
  jobId: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<ExtensionApiResult<JobRow>> {
  return extensionApiFetch<JobRow>({
    origin: input.origin,
    token: input.token,
    path: `/api/applyflow/v2/jobs/${encodeURIComponent(input.jobId)}`,
    signal: input.signal,
    fetchImpl: input.fetchImpl,
  });
}

async function fetchApplicationById(input: {
  origin: string;
  token: string;
  applicationId: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<ExtensionApiResult<ApplicationRow>> {
  return extensionApiFetch<ApplicationRow>({
    origin: input.origin,
    token: input.token,
    path: `/api/applyflow/v2/applications/${encodeURIComponent(input.applicationId)}`,
    signal: input.signal,
    fetchImpl: input.fetchImpl,
  });
}

/**
 * Confirms an existing job is the same logical record (stable id + URL association).
 * Incompatible content → conflict_incompatible (not silent reuse).
 */
export function assertJobReusable(
  expected: { jobId: string; jobUrl: string },
  existing: JobRow,
): RegisterCloudResult | { ok: true; jobId: string } {
  if (existing.id !== expected.jobId) {
    return fail("conflict_incompatible", 409);
  }
  if (!urlsCompatible(expected.jobUrl, existing.url)) {
    return fail("conflict_incompatible", 409);
  }
  return { ok: true, jobId: existing.id };
}

/**
 * Confirms an existing application matches stable id / sourceJob association / URL.
 */
export function assertApplicationReusable(
  expected: { applicationId: string; jobId: string; jobUrl: string },
  existing: ApplicationRow,
): RegisterCloudResult | { ok: true; applicationId: string; applicationVersion: number } {
  if (existing.sourceJobId && existing.sourceJobId !== expected.jobId) {
    return fail("conflict_incompatible", 409);
  }
  if (existing.id !== expected.applicationId && existing.sourceJobId !== expected.jobId) {
    return fail("conflict_incompatible", 409);
  }
  if (!urlsCompatible(expected.jobUrl, existing.jobUrl)) {
    return fail("conflict_incompatible", 409);
  }
  if (typeof existing.version !== "number") {
    return fail("conflict_unknown", 409);
  }
  return {
    ok: true,
    applicationId: existing.id,
    applicationVersion: existing.version,
  };
}

async function reconcileExistingJob(input: {
  origin: string;
  token: string;
  jobId: string;
  jobUrl: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<RegisterCloudResult | { ok: true; jobId: string }> {
  const loaded = await fetchJobById(input);
  if (!loaded.ok) {
    if (loaded.status === 404) return fail("not_found", 404);
    return fail(loaded.error, loaded.status);
  }
  return assertJobReusable({ jobId: input.jobId, jobUrl: input.jobUrl }, loaded.body);
}

async function reconcileExistingApplication(input: {
  origin: string;
  token: string;
  applicationId: string;
  jobId: string;
  jobUrl: string;
  preferListForJobLink?: boolean;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<RegisterCloudResult | { ok: true; applicationId: string; applicationVersion: number }> {
  const byId = await fetchApplicationById(input);
  if (byId.ok) {
    return assertApplicationReusable(
      { applicationId: input.applicationId, jobId: input.jobId, jobUrl: input.jobUrl },
      byId.body,
    );
  }
  if (byId.status !== 404 && !input.preferListForJobLink) {
    return fail(byId.error, byId.status);
  }

  const listed = await extensionApiFetch<{ applications: ApplicationRow[] }>({
    origin: input.origin,
    token: input.token,
    path: "/api/applyflow/v2/applications",
    signal: input.signal,
    fetchImpl: input.fetchImpl,
  });
  if (!listed.ok) return fail(listed.error, listed.status);

  const existing =
    listed.body.applications.find((row) => row.id === input.applicationId) ??
    listed.body.applications.find((row) => row.sourceJobId === input.jobId) ??
    listed.body.applications.find((row) => urlsCompatible(input.jobUrl, row.jobUrl));

  if (!existing) {
    return fail("not_found", 404);
  }
  return assertApplicationReusable(
    { applicationId: input.applicationId, jobId: input.jobId, jobUrl: input.jobUrl },
    existing,
  );
}

function mapCreateConflict(status: number, error: string): RegisterCloudResult | null {
  if (status !== 409) return null;
  const kind = classifyHttp409(error);
  if (kind === "version_conflict") return fail(VERSION_CONFLICT, 409);
  if (kind === "unknown") return fail("conflict_unknown", 409);
  return null;
}

export async function registerCloudJobAndApplication(input: {
  origin: string;
  token: string;
  accountId: string;
  draft: SaveApplicationInput;
  selectedVariantId?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<RegisterCloudResult> {
  const jobUrl = input.draft.jobUrl?.trim() || "";
  if (!jobUrl) {
    return fail("missing_job_url", 400);
  }
  const { jobId, applicationId } = exportStableCloudIds(input.accountId, jobUrl);
  const title = (input.draft.jobTitle ?? "LinkedIn opportunity").trim().slice(0, 200) || "LinkedIn opportunity";

  const jobBody = {
    id: jobId,
    title,
    company: input.draft.companyName?.trim().slice(0, 200) || undefined,
    url: jobUrl.slice(0, 500),
    source: "linkedin" as const,
    status: "reviewing" as const,
    jobContext: {
      skills: input.draft.jobMeta?.detectedSkills?.slice(0, 40) ?? [],
      ...(input.draft.jobMeta?.seniority ? { seniority: input.draft.jobMeta.seniority } : {}),
      ...(input.draft.jobMeta?.workModel ? { workModel: input.draft.jobMeta.workModel } : {}),
    },
    jobMatch: jobMatchFromDraft(input.draft),
    ...(input.selectedVariantId
      ? {
          evaluatedWith: {
            variantId: input.selectedVariantId,
            variantName: input.selectedVariantId,
          },
        }
      : {}),
  };

  const createdJob = await extensionApiFetch<{ id: string }>({
    origin: input.origin,
    token: input.token,
    path: "/api/applyflow/v2/jobs",
    method: "POST",
    body: jobBody,
    signal: input.signal,
    fetchImpl: input.fetchImpl,
  });

  let reusedJob = false;
  if (!createdJob.ok) {
    if (createdJob.error === "network" || createdJob.error === "aborted") {
      const recovered = await reconcileExistingJob({
        origin: input.origin,
        token: input.token,
        jobId,
        jobUrl,
        signal: input.signal,
        fetchImpl: input.fetchImpl,
      });
      if (recovered.ok && !("applicationId" in recovered)) {
        reusedJob = true;
      } else if (!recovered.ok && (recovered.status === 404 || recovered.error === "not_found")) {
        return fail(createdJob.error === "aborted" ? "aborted" : "network", 0);
      } else {
        return recovered.ok ? fail("conflict_unknown", 409) : recovered;
      }
    } else {
      const mapped = mapCreateConflict(createdJob.status, createdJob.error);
      if (mapped) return mapped;
      if (createdJob.status === 409 && classifyHttp409(createdJob.error) === "duplicate_job") {
        const reconciled = await reconcileExistingJob({
          origin: input.origin,
          token: input.token,
          jobId,
          jobUrl,
          signal: input.signal,
          fetchImpl: input.fetchImpl,
        });
        if (reconciled.ok && !("applicationId" in reconciled)) {
          reusedJob = true;
        } else if (!reconciled.ok && (reconciled.status === 404 || reconciled.error === "not_found")) {
          return fail(DUPLICATE_JOB, 409);
        } else {
          return reconciled.ok ? fail("conflict_unknown", 409) : reconciled;
        }
      } else {
        return fail(createdJob.error, createdJob.status);
      }
    }
  }

  const applicationBody = {
    id: applicationId,
    source: "linkedin" as const,
    status: input.draft.status ?? "reviewing",
    sourceJobId: jobId,
    jobTitle: input.draft.jobTitle ?? null,
    companyName: input.draft.companyName ?? null,
    jobUrl,
    fitScore: input.draft.fitScore ?? null,
    notes: input.draft.notes ?? null,
    jobMeta: input.draft.jobMeta ?? null,
    extras: {
      fieldsDetected: input.draft.fieldsDetected,
      fieldsFilled: input.draft.fieldsFilled,
      blockedCount: input.draft.blockedCount,
      failedCount: input.draft.failedCount,
      matchDecision: input.draft.matchDecision,
      resumeTrack: input.draft.resumeTrack,
      strengthsSummary: input.draft.strengthsSummary,
      gapsSummary: input.draft.gapsSummary,
      preparationStatus: input.draft.preparationStatus,
    },
    ...(input.selectedVariantId
      ? { v2Meta: { resumeVariant: input.selectedVariantId } }
      : {}),
  };

  const createdApp = await extensionApiFetch<ApplicationRow>({
    origin: input.origin,
    token: input.token,
    path: "/api/applyflow/v2/applications",
    method: "POST",
    body: applicationBody,
    signal: input.signal,
    fetchImpl: input.fetchImpl,
  });

  if (createdApp.ok) {
    return {
      ok: true,
      jobId,
      applicationId: createdApp.body.id,
      applicationVersion: createdApp.body.version,
      reused: reusedJob,
    };
  }

  if (createdApp.error === "network" || createdApp.error === "aborted") {
    const recovered = await reconcileExistingApplication({
      origin: input.origin,
      token: input.token,
      applicationId,
      jobId,
      jobUrl,
      preferListForJobLink: true,
      signal: input.signal,
      fetchImpl: input.fetchImpl,
    });
    if (recovered.ok && "applicationVersion" in recovered) {
      return {
        ok: true,
        jobId,
        applicationId: recovered.applicationId,
        applicationVersion: recovered.applicationVersion,
        reused: true,
      };
    }
    if (!recovered.ok && (recovered.status === 404 || recovered.error === "not_found" || recovered.error === DUPLICATE_APP)) {
      return fail(createdApp.error === "aborted" ? "aborted" : "network", 0);
    }
    return recovered.ok ? fail("conflict_unknown", 409) : recovered;
  }

  const mapped = mapCreateConflict(createdApp.status, createdApp.error);
  if (mapped) return mapped;

  if (
    createdApp.status === 409 &&
    classifyHttp409(createdApp.error) === "duplicate_application"
  ) {
    const reconciled = await reconcileExistingApplication({
      origin: input.origin,
      token: input.token,
      applicationId,
      jobId,
      jobUrl,
      preferListForJobLink: createdApp.error === DUPLICATE_APP_FOR_JOB,
      signal: input.signal,
      fetchImpl: input.fetchImpl,
    });
    if (reconciled.ok && "applicationVersion" in reconciled) {
      return {
        ok: true,
        jobId,
        applicationId: reconciled.applicationId,
        applicationVersion: reconciled.applicationVersion,
        reused: true,
      };
    }
    if (!reconciled.ok && (reconciled.status === 404 || reconciled.error === "not_found")) {
      return fail(createdApp.error, 409);
    }
    return reconciled.ok ? fail("conflict_unknown", 409) : reconciled;
  }

  return fail(createdApp.error, createdApp.status);
}

export async function markCloudApplicationSent(input: {
  origin: string;
  token: string;
  applicationId: string;
  expectedVersion: number;
  confirmedExternalSubmit: boolean;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<RegisterCloudResult> {
  if (!input.confirmedExternalSubmit) {
    return fail("external_submit_not_confirmed", 400);
  }
  const result = await extensionApiFetch<{
    application: ApplicationRow;
    job?: { id: string } | null;
  }>({
    origin: input.origin,
    token: input.token,
    path: `/api/applyflow/v2/applications/${encodeURIComponent(input.applicationId)}/lifecycle`,
    method: "POST",
    body: {
      expectedVersion: input.expectedVersion,
      status: "applied",
    },
    signal: input.signal,
    fetchImpl: input.fetchImpl,
  });
  if (!result.ok) {
    if (result.status === 409) {
      const kind = classifyHttp409(result.error);
      if (kind === "version_conflict") return fail(VERSION_CONFLICT, 409);
      return fail("conflict_unknown", 409);
    }
    return fail(result.error, result.status);
  }
  return {
    ok: true,
    applicationId: result.body.application.id,
    applicationVersion: result.body.application.version,
    jobId: result.body.job?.id ?? result.body.application.sourceJobId ?? "",
    reused: false,
  };
}
