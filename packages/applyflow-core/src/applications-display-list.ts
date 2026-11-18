import { applicationSourceFromJob, findApplicationForJob } from "./application-identity.js";
import type { ApplyFlowApplicationV2Envelope } from "./application-record-v2.js";
import type { ApplyFlowJob } from "./job-match-types.js";

/** Stable React/list id for read-only rows derived from applied jobs (never persisted). */
export const DISPLAY_DERIVED_APPLIED_JOB_ID_PREFIX = "derived_applied_" as const;

export function displayDerivedApplicationId(jobId: string): string {
  return `${DISPLAY_DERIVED_APPLIED_JOB_ID_PREFIX}${jobId}`;
}

export function isDisplayDerivedFromAppliedJob(
  application: Pick<ApplyFlowApplicationV2Envelope, "v2">,
): boolean {
  return application.v2?.displayDerivedFromAppliedJob === true;
}

/**
 * Build a read-only Application-shaped row from an applied job that has no linked Application.
 * Does not invent appliedAt / send date; callers must not persist this object.
 */
export function displayApplicationFromAppliedJob(job: ApplyFlowJob): ApplyFlowApplicationV2Envelope {
  const skills = job.jobContext.skills ?? [];
  return {
    id: displayDerivedApplicationId(job.id),
    // Intentionally empty: no proven Application createdAt / send timestamp for legacy applied jobs.
    createdAt: "",
    updatedAt: "",
    source: applicationSourceFromJob(job),
    jobTitle: job.title,
    companyName: job.company,
    jobUrl: job.jobContext.officialApplyUrl ?? job.url,
    status: "applied",
    fitScore: job.jobMatch.score,
    jobMeta: {
      ...(job.jobContext.seniority ? { seniority: job.jobContext.seniority } : {}),
      ...(job.jobContext.workModel ? { workModel: job.jobContext.workModel } : {}),
      ...(skills.length ? { detectedSkills: [...skills] } : {}),
    },
    v2: {
      sourceJobId: job.id,
      displayDerivedFromAppliedJob: true,
    },
  };
}

function parseIsoTime(iso?: string): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : NaN;
}

/**
 * Candidaturas list: persisted applications plus applied jobs that lack a linked Application.
 * Dedupes by canonical findApplicationForJob (sourceJobId, then jobUrl). Read-only; no writes.
 */
export function listDashboardApplicationsForDisplay(
  applications: readonly ApplyFlowApplicationV2Envelope[],
  jobs: readonly ApplyFlowJob[],
): ApplyFlowApplicationV2Envelope[] {
  const rows: ApplyFlowApplicationV2Envelope[] = [...applications];
  for (const job of jobs) {
    if (job.status !== "applied") continue;
    if (findApplicationForJob(applications, job)) continue;
    rows.push(displayApplicationFromAppliedJob(job));
  }

  return rows.sort((left, right) => {
    const leftDerived = isDisplayDerivedFromAppliedJob(left);
    const rightDerived = isDisplayDerivedFromAppliedJob(right);
    const leftTime = parseIsoTime(left.createdAt);
    const rightTime = parseIsoTime(right.createdAt);
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
      return rightTime - leftTime;
    }
    if (Number.isFinite(leftTime) !== Number.isFinite(rightTime)) {
      return Number.isFinite(leftTime) ? -1 : 1;
    }
    if (leftDerived !== rightDerived) {
      return leftDerived ? 1 : -1;
    }
    return (left.jobTitle ?? "").localeCompare(right.jobTitle ?? "", "pt");
  });
}
