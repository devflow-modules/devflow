import type { JobDecisionV2 } from "./application-decision-types.js";
import type { ApplicationPackV2 } from "./application-pack-v2.js";
import { captureApplicationDecisionSnapshot } from "./application-decision-snapshot.js";
import { applicationMetaFromDecision, type ApplyFlowApplicationV2Envelope } from "./application-record-v2.js";
import type { ApplyFlowApplication, ApplyFlowApplicationStatus } from "./application-types.js";
import { emptyOutcome } from "./application-outcome.js";
import type { ApplicationOutcome } from "./career-analytics-types.js";
import type { ApplyFlowJob } from "./job-match-types.js";

export function applicationSourceFromJob(job: ApplyFlowJob): ApplyFlowApplication["source"] {
  if (job.source === "linkedin") return "linkedin";
  if (job.source === "json") return "json";
  return "paste";
}

export function findApplicationForJob(
  applications: readonly ApplyFlowApplicationV2Envelope[],
  job: Pick<ApplyFlowJob, "id" | "url">,
): ApplyFlowApplicationV2Envelope | undefined {
  const bySourceJob = applications.find((item) => item.v2?.sourceJobId === job.id);
  if (bySourceJob) return bySourceJob;
  if (job.url) {
    const byUrl = applications.find((item) => item.jobUrl && item.jobUrl === job.url);
    if (byUrl) return byUrl;
  }
  return undefined;
}

export function outcomeBelongsToApplication(
  outcome: Pick<ApplicationOutcome, "applicationId">,
  applications: readonly ApplyFlowApplication[],
): boolean {
  return applications.some((item) => item.id === outcome.applicationId);
}

export function canRecordApplicationOutcome(
  applicationId: string,
  applications: readonly ApplyFlowApplication[],
): boolean {
  return applications.some((item) => item.id === applicationId);
}

export function createApplicationId(jobId: string, now: Date): string {
  return `app_${now.getTime().toString(36)}_${jobId}`;
}

export function createApplicationFromJob(input: {
  job: ApplyFlowJob;
  decision: JobDecisionV2;
  pack?: ApplicationPackV2;
  applicationId?: string;
  now?: Date;
}): { application: ApplyFlowApplicationV2Envelope; outcome: ApplicationOutcome } {
  const now = input.now ?? new Date();
  const applicationId = input.applicationId ?? createApplicationId(input.job.id, now);
  if (applicationId === input.job.id) {
    throw new Error("Application id must not equal job id.");
  }
  const iso = now.toISOString();
  const resumeVariant = input.pack?.resumeRecommendation?.variant.id;
  const application: ApplyFlowApplicationV2Envelope = {
    id: applicationId,
    createdAt: iso,
    updatedAt: iso,
    source: applicationSourceFromJob(input.job),
    jobTitle: input.job.title,
    companyName: input.job.company,
    jobUrl: input.job.url,
    status: "reviewing",
    fitScore: input.decision.overall,
    v2: {
      ...applicationMetaFromDecision(input.decision, resumeVariant ? { resumeVariant } : undefined),
      sourceJobId: input.job.id,
    },
  };
  const snapshot = captureApplicationDecisionSnapshot({
    decision: input.decision,
    pack: input.pack,
    resumeVariant,
    now,
  });
  const outcome: ApplicationOutcome = {
    ...emptyOutcome(applicationId, now),
    fitAtApplication: snapshot.overallFit,
    decisionAtApplication: snapshot.decision,
    priorityAtApplication: snapshot.priority,
    resumeVariant: snapshot.resumeVariant,
    snapshot,
  };
  return { application, outcome };
}

const ALREADY_SUBMITTED: readonly ApplyFlowApplicationStatus[] = [
  "applied",
  "waiting_response",
  "interview",
  "technical_test",
  "rejected",
  "accepted",
  "hired",
];

/** Marks the same Application as sent. Does not mint a new id or touch the snapshot. */
export function markApplicationSubmitted(
  application: ApplyFlowApplication,
  now?: Date,
): ApplyFlowApplication {
  if (ALREADY_SUBMITTED.includes(application.status)) return application;
  return {
    ...application,
    status: "applied",
    updatedAt: (now ?? new Date()).toISOString(),
  };
}
