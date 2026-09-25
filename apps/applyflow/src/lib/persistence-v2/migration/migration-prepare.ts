import type { ApplyFlowApplicationV2Envelope, ApplyFlowJob, ApplicationOutcome } from "@devflow/applyflow-core";

import {
  APPLYFLOW_DASHBOARD_STORAGE_KEY,
  loadDashboardImport,
} from "@/lib/local-import-storage";
import {
  APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY,
  loadDashboardJobs,
} from "@/lib/local-job-storage";
import { loadDashboardAnalytics } from "@/lib/local-analytics-storage";

import {
  MIGRATION_MAX_APPLICATIONS,
  MIGRATION_MAX_JOBS,
  MIGRATION_SOURCE_VERSION,
  migrationApplicationSchema,
  migrationImportBodySchema,
  migrationJobSchema,
  type MigrationApplicationInput,
  type MigrationImportBody,
  type MigrationJobInput,
} from "./migration-dto";
import { fingerprintMigrationBundle } from "./migration-fingerprint";

export type MigrationPrepareErrorCode =
  | "legacy_unreadable"
  | "legacy_partial_or_malformed"
  | "duplicate_id"
  | "migration_dataset_too_large";

export type MigrationPrepareFailure = {
  ok: false;
  code: MigrationPrepareErrorCode;
  detail?: string;
};

export type MigrationPrepareSuccess = {
  ok: true;
  bundle: MigrationImportBody;
  empty: boolean;
};

export type MigrationPrepareResult = MigrationPrepareSuccess | MigrationPrepareFailure;

const POST_APPLY_STATUSES = new Set([
  "applied",
  "waiting_response",
  "interview",
  "technical_test",
  "rejected",
  "accepted",
  "hired",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compareId(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function hasStorageKey(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) != null;
  } catch {
    return false;
  }
}

/**
 * When multiple Outcomes share an applicationId, pick the earliest valid
 * appliedAt (ISO parseable). Missing/invalid appliedAt values are ignored.
 */
export function deriveAppliedAtFromOutcomes(
  applicationId: string,
  outcomes: readonly ApplicationOutcome[],
): string | undefined {
  const candidates = outcomes
    .filter((outcome) => outcome.applicationId === applicationId)
    .map((outcome) => outcome.appliedAt)
    .filter((value): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(left) - Date.parse(right));
  return candidates[0];
}

function jobToMigrationInput(job: ApplyFlowJob): MigrationJobInput {
  return {
    id: job.id,
    title: job.title,
    ...(job.company !== undefined ? { company: job.company } : {}),
    ...(job.location !== undefined ? { location: job.location } : {}),
    ...(job.url !== undefined ? { url: job.url } : {}),
    source: job.source,
    status: job.status,
    jobContext: job.jobContext,
    ...(job.descriptionSnapshot !== undefined ? { descriptionSnapshot: job.descriptionSnapshot } : {}),
    jobMatch: job.jobMatch,
    ...(job.evaluatedWith !== undefined ? { evaluatedWith: job.evaluatedWith } : {}),
    ...(job.curriculumRecommendation !== undefined
      ? { curriculumRecommendation: job.curriculumRecommendation }
      : {}),
    ...(job.applicationPack !== undefined ? { applicationPack: job.applicationPack } : {}),
  };
}

function extrasFromApplication(app: ApplyFlowApplicationV2Envelope): MigrationApplicationInput["extras"] {
  const extras: NonNullable<MigrationApplicationInput["extras"]> = {};
  if (app.fieldsDetected !== undefined) extras.fieldsDetected = app.fieldsDetected;
  if (app.fieldsFilled !== undefined) extras.fieldsFilled = app.fieldsFilled;
  if (app.blockedCount !== undefined) extras.blockedCount = app.blockedCount;
  if (app.failedCount !== undefined) extras.failedCount = app.failedCount;
  if (app.matchDecision !== undefined) extras.matchDecision = app.matchDecision;
  if (app.resumeTrack !== undefined) extras.resumeTrack = app.resumeTrack;
  if (app.strengthsSummary !== undefined) extras.strengthsSummary = app.strengthsSummary;
  if (app.gapsSummary !== undefined) extras.gapsSummary = app.gapsSummary;
  if (app.preparationStatus !== undefined) extras.preparationStatus = app.preparationStatus;
  return Object.keys(extras).length > 0 ? extras : null;
}

function v2MetaFromApplication(app: ApplyFlowApplicationV2Envelope): MigrationApplicationInput["v2Meta"] {
  const meta = app.v2;
  if (!meta) return null;
  const out: NonNullable<MigrationApplicationInput["v2Meta"]> = {};
  if (meta.decision !== undefined) out.decision = meta.decision;
  if (meta.priority !== undefined) out.priority = meta.priority;
  if (meta.hiringProbability !== undefined) out.hiringProbability = meta.hiringProbability;
  if (meta.careerUpside !== undefined) out.careerUpside = meta.careerUpside;
  if (meta.eliminationRisk !== undefined) out.eliminationRisk = meta.eliminationRisk;
  if (meta.resumeVariant !== undefined) out.resumeVariant = meta.resumeVariant;
  if (meta.networkingStatus !== undefined) out.networkingStatus = meta.networkingStatus;
  if (meta.nextActionAt !== undefined) out.nextActionAt = meta.nextActionAt;
  return Object.keys(out).length > 0 ? out : null;
}

export function applicationToMigrationInput(
  app: ApplyFlowApplicationV2Envelope,
  appliedAt?: string,
): MigrationApplicationInput {
  const sourceJobId = app.v2?.sourceJobId ?? null;
  const payload: MigrationApplicationInput = {
    id: app.id,
    source: app.source,
    status: app.status,
    sourceJobId,
    jobTitle: app.jobTitle ?? null,
    companyName: app.companyName ?? null,
    jobUrl: app.jobUrl ?? null,
    fitScore: app.fitScore ?? null,
    notes: app.notes ?? null,
    jobMeta: app.jobMeta ?? null,
    v2Meta: v2MetaFromApplication(app),
    extras: extrasFromApplication(app),
  };
  if (
    appliedAt &&
    POST_APPLY_STATUSES.has(app.status) &&
    Number.isFinite(Date.parse(appliedAt))
  ) {
    payload.appliedAt = appliedAt;
  }
  return payload;
}

function detectDuplicateIds(ids: string[]): string | null {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return null;
}

function readPhysicalApplications():
  | { ok: true; applications: ApplyFlowApplicationV2Envelope[] }
  | { ok: false; code: MigrationPrepareErrorCode } {
  if (typeof window === "undefined") {
    return { ok: true, applications: [] };
  }
  const hasKey = hasStorageKey(APPLYFLOW_DASHBOARD_STORAGE_KEY);
  const loaded = loadDashboardImport();
  if (!hasKey) {
    return { ok: true, applications: [] };
  }
  if (!loaded) {
    return { ok: false, code: "legacy_unreadable" };
  }
  if (!Array.isArray(loaded.applications)) {
    return { ok: false, code: "legacy_unreadable" };
  }
  const applications: ApplyFlowApplicationV2Envelope[] = [];
  for (const item of loaded.applications) {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.source !== "string") {
      return { ok: false, code: "legacy_partial_or_malformed" };
    }
    if (typeof item.status !== "string") {
      return { ok: false, code: "legacy_partial_or_malformed" };
    }
    applications.push(item as ApplyFlowApplicationV2Envelope);
  }
  return { ok: true, applications };
}

/**
 * Build the deterministic F3.2 migration bundle from canonical V1 dashboard storage.
 * Does not mutate V1 keys. Does not submit.
 */
export function prepareMigrationBundle(): MigrationPrepareResult {
  if (typeof window === "undefined") {
    return { ok: true, empty: true, bundle: emptyBundle() };
  }

  const jobsLoad = loadDashboardJobs();
  if (jobsLoad.status === "unreadable") {
    return { ok: false, code: "legacy_unreadable", detail: jobsLoad.reason };
  }
  if (jobsLoad.status === "partial" || jobsLoad.ignoredCount > 0) {
    return {
      ok: false,
      code: "legacy_partial_or_malformed",
      detail: `ignored_jobs=${jobsLoad.ignoredCount}`,
    };
  }
  if (hasStorageKey(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY) && jobsLoad.status === "empty") {
    // Raw key present but empty/invalid path already handled; empty status with key means
    // versioned empty jobs array — allowed.
  }

  const appsRead = readPhysicalApplications();
  if (!appsRead.ok) return appsRead;

  const outcomes = loadDashboardAnalytics().outcomes;
  const jobs = [...jobsLoad.jobs].map(jobToMigrationInput).sort((a, b) => compareId(a.id, b.id));
  const applications = [...appsRead.applications]
    .map((app) =>
      applicationToMigrationInput(app, deriveAppliedAtFromOutcomes(app.id, outcomes)),
    )
    .sort((a, b) => compareId(a.id, b.id));

  const dupJob = detectDuplicateIds(jobs.map((job) => job.id));
  if (dupJob) {
    return { ok: false, code: "duplicate_id", detail: `job:${dupJob}` };
  }
  const dupApp = detectDuplicateIds(applications.map((app) => app.id));
  if (dupApp) {
    return { ok: false, code: "duplicate_id", detail: `application:${dupApp}` };
  }

  if (jobs.length > MIGRATION_MAX_JOBS || applications.length > MIGRATION_MAX_APPLICATIONS) {
    return {
      ok: false,
      code: "migration_dataset_too_large",
      detail: `jobs=${jobs.length},applications=${applications.length},max=${MIGRATION_MAX_JOBS}`,
    };
  }

  for (const job of jobs) {
    const parsed = migrationJobSchema.safeParse(job);
    if (!parsed.success) {
      return { ok: false, code: "legacy_partial_or_malformed", detail: `job:${job.id}` };
    }
  }
  for (const application of applications) {
    const parsed = migrationApplicationSchema.safeParse(application);
    if (!parsed.success) {
      return {
        ok: false,
        code: "legacy_partial_or_malformed",
        detail: `application:${application.id}`,
      };
    }
  }

  const fingerprint = fingerprintMigrationBundle({ jobs, applications });
  const bundle: MigrationImportBody = {
    sourceVersion: MIGRATION_SOURCE_VERSION,
    fingerprint,
    jobs,
    applications,
  };
  const parsedBundle = migrationImportBodySchema.safeParse(bundle);
  if (!parsedBundle.success) {
    return { ok: false, code: "legacy_partial_or_malformed", detail: "bundle" };
  }

  return {
    ok: true,
    empty: jobs.length === 0 && applications.length === 0,
    bundle,
  };
}

function emptyBundle(): MigrationImportBody {
  return {
    sourceVersion: MIGRATION_SOURCE_VERSION,
    fingerprint: fingerprintMigrationBundle({ jobs: [], applications: [] }),
    jobs: [],
    applications: [],
  };
}
