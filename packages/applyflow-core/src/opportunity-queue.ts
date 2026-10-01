import type { ApplyFlowApplicationStatus } from "./application-types.js";
import type { ApplyFlowJob, ApplyFlowJobSource, JobMatchDecision } from "./job-match-types.js";

/** Explicitly saved jobs always start under review — Match decision is evidence only. */
export const INITIAL_SAVED_JOB_STATUS = "reviewing" as const satisfies ApplyFlowApplicationStatus;

export type OpportunityQueueView = "active" | "all" | "ignored";
export type OpportunityQueueSort = "match" | "recency";

/**
 * Active pre-application opportunity queue.
 * Membership is user intent (`status`), never Match Engine `jobMatch.decision`.
 */
export function isActiveOpportunityJob(job: Pick<ApplyFlowJob, "status">): boolean {
  return job.status === "reviewing";
}

export function countOpportunityQueueViews(jobs: readonly ApplyFlowJob[]): {
  active: number;
  all: number;
  ignored: number;
} {
  let active = 0;
  let ignored = 0;
  for (const job of jobs) {
    if (job.status === "reviewing") active += 1;
    else if (job.status === "ignored") ignored += 1;
  }
  return { active, all: jobs.length, ignored };
}

export function filterJobsByQueueView(
  jobs: readonly ApplyFlowJob[],
  view: OpportunityQueueView,
): ApplyFlowJob[] {
  if (view === "active") return jobs.filter(isActiveOpportunityJob);
  if (view === "ignored") return jobs.filter((job) => job.status === "ignored");
  return [...jobs];
}

export function filterOpportunityJobs(
  jobs: readonly ApplyFlowJob[],
  filters: {
    decision?: JobMatchDecision | "all";
    source?: ApplyFlowJobSource | "all";
  },
): ApplyFlowJob[] {
  const decision = filters.decision ?? "all";
  const source = filters.source ?? "all";
  return jobs.filter((job) => {
    if (decision !== "all" && job.jobMatch.decision !== decision) return false;
    if (source !== "all" && job.source !== source) return false;
    return true;
  });
}

/** Stable sort: score desc then createdAt desc then id asc; or createdAt desc then id. */
export function sortOpportunityJobs(
  jobs: readonly ApplyFlowJob[],
  sort: OpportunityQueueSort,
): ApplyFlowJob[] {
  const copy = [...jobs];
  if (sort === "match") {
    copy.sort((a, b) => {
      const byScore = b.jobMatch.score - a.jobMatch.score;
      if (byScore !== 0) return byScore;
      const byCreated = b.createdAt.localeCompare(a.createdAt);
      if (byCreated !== 0) return byCreated;
      return a.id.localeCompare(b.id);
    });
    return copy;
  }
  copy.sort((a, b) => {
    const byCreated = b.createdAt.localeCompare(a.createdAt);
    if (byCreated !== 0) return byCreated;
    return a.id.localeCompare(b.id);
  });
  return copy;
}

export function selectOpportunityQueueJobs(
  jobs: readonly ApplyFlowJob[],
  options: {
    view: OpportunityQueueView;
    sort: OpportunityQueueSort;
    decision?: JobMatchDecision | "all";
    source?: ApplyFlowJobSource | "all";
  },
): ApplyFlowJob[] {
  const viewed = filterJobsByQueueView(jobs, options.view);
  const filtered = filterOpportunityJobs(viewed, {
    decision: options.decision,
    source: options.source,
  });
  return sortOpportunityJobs(filtered, options.sort);
}

/** Human dismisses an opportunity — persists as ignored; does not delete. */
export function ignoreApplyFlowJob(job: ApplyFlowJob, now: Date = new Date()): ApplyFlowJob {
  if (job.status === "ignored") return job;
  return {
    ...job,
    status: "ignored",
    updatedAt: now.toISOString(),
  };
}

/** Human restores an ignored job to the active queue — does not recompute match. */
export function restoreApplyFlowJobToQueue(job: ApplyFlowJob, now: Date = new Date()): ApplyFlowJob {
  if (job.status === "reviewing") return job;
  return {
    ...job,
    status: "reviewing",
    updatedAt: now.toISOString(),
  };
}
