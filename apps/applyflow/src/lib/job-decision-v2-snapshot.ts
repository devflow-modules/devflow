import { loadDashboardAnalytics } from "@/lib/local-analytics-storage";
import { loadDashboardContacts } from "@/lib/local-contact-storage";
import { loadDashboardImport } from "@/lib/local-import-storage";
import { computeClosedLoopV1Backfill } from "@/lib/persist-application-decision";
import { resolveV2CandidateContext } from "@/lib/v2-candidate-context";
import { loadDashboardJobs } from "@/lib/local-job-storage";
import {
  createApplicationPackV2,
  evaluateJobDecisionV2,
  findApplicationForJob,
  getApplicationLifecycleView,
  type ApplicationCareerEvent,
  type ApplicationDecisionSnapshot,
  type ApplicationPackV2,
  type ApplyFlowApplicationV2Envelope,
  type ApplyFlowJob,
  type ApplyFlowPipelineStatusV2,
  type Contact,
  type JobDecisionV2,
} from "@devflow/applyflow-core";

export type JobDecisionV2Snapshot = {
  job: ApplyFlowJob | null;
  contacts: Contact[];
  application: ApplyFlowApplicationV2Envelope | null;
  registeredSnapshot: ApplicationDecisionSnapshot | null;
  lifecycleEvents: ApplicationCareerEvent[];
  pipelineStatus: ApplyFlowPipelineStatusV2 | null;
  needsResume: boolean;
  decision: JobDecisionV2 | null;
  pack: ApplicationPackV2 | null;
};

export function jobTextFrom(job: ApplyFlowJob): string {
  if (job.descriptionSnapshot?.trim()) return job.descriptionSnapshot;
  return [job.title, job.company, job.jobContext.skills.join(", ")].filter(Boolean).join("\n");
}

function emptySnapshot(partial: Partial<JobDecisionV2Snapshot> & { job: ApplyFlowJob | null; contacts: Contact[] }): JobDecisionV2Snapshot {
  return {
    application: null,
    registeredSnapshot: null,
    lifecycleEvents: [],
    pipelineStatus: null,
    needsResume: false,
    decision: null,
    pack: null,
    ...partial,
  };
}

export function loadJobDecisionV2Snapshot(
  jobId: string,
  revision = 0,
  records?: {
    job: ApplyFlowJob | null;
    application: ApplyFlowApplicationV2Envelope | null;
  },
): JobDecisionV2Snapshot {
  void revision;
  const found = records ? records.job : (loadDashboardJobs().jobs.find((item) => item.id === jobId) ?? null);
  const stored = loadDashboardContacts();
  const contacts = stored.contacts.filter((item) => !item.jobId || item.jobId === jobId);

  if (!found) {
    return emptySnapshot({ job: null, contacts });
  }

  const foundApp = records
    ? records.application
    : (findApplicationForJob(loadDashboardImport()?.applications ?? [], found) ?? null);
  const storedAnalytics = loadDashboardAnalytics();
  const computedBackfill = computeClosedLoopV1Backfill();
  const analytics =
    computedBackfill.ok
      ? {
          outcomes: computedBackfill.outcomes,
          events: computedBackfill.events,
          efforts: computedBackfill.efforts,
          status: storedAnalytics.status,
        }
      : storedAnalytics;
  const storedOutcome = foundApp
    ? analytics.outcomes.find((item) => item.applicationId === foundApp.id)
    : undefined;
  const registeredSnapshot = storedOutcome?.snapshot ?? null;
  let lifecycleEvents: ApplicationCareerEvent[] = [];
  let pipelineStatus: ApplyFlowPipelineStatusV2 | null = null;
  if (foundApp) {
    const view = getApplicationLifecycleView({
      application: foundApp,
      outcome: storedOutcome,
      events: analytics.events,
    });
    lifecycleEvents = view.events;
    pipelineStatus = view.status;
  }

  const base = emptySnapshot({
    job: found,
    contacts,
    application: foundApp,
    registeredSnapshot,
    lifecycleEvents,
    pipelineStatus,
  });

  const text = jobTextFrom(found);
  if (!text.trim()) {
    return base;
  }

  const ctx = resolveV2CandidateContext();
  if (!ctx.ok) {
    return { ...base, needsResume: true };
  }

  const decision = evaluateJobDecisionV2({
    jobText: text,
    evidence: ctx.evidence,
    profile: ctx.profile,
    jobId: found.id,
  });

  return {
    ...base,
    decision,
    pack: createApplicationPackV2({
      jobId: found.id,
      jobText: text,
      jobTitle: found.title,
      companyName: found.company,
      source: found.source,
      profile: ctx.profile,
      evidence: ctx.evidence,
      decision,
      resumeLibrary: ctx.library,
    }),
  };
}
