export type DashboardWorkFlags = {
  hasResume: boolean;
  hasJobs: boolean;
  hasApplications: boolean;
};

export function dashboardWorkFlags(input: {
  resumeCount: number;
  jobCount: number;
  applicationCount: number;
}): DashboardWorkFlags {
  return {
    hasResume: input.resumeCount > 0,
    hasJobs: input.jobCount > 0,
    hasApplications: input.applicationCount > 0,
  };
}

export type DashboardNextStepId = "resume" | "job" | "analyze" | "track";

export function dashboardNextStepId(flags: DashboardWorkFlags): DashboardNextStepId {
  if (!flags.hasResume) return "resume";
  if (!flags.hasJobs) return "job";
  if (!flags.hasApplications) return "analyze";
  return "track";
}

export function shouldShowApplicationsList(flags: DashboardWorkFlags): boolean {
  return flags.hasApplications;
}

export function shouldShowInterviewPrep(flags: DashboardWorkFlags): boolean {
  return flags.hasApplications;
}

export function dashboardAnalyzeHref(
  jobs: readonly { id: string; createdAt?: string; updatedAt?: string }[],
): string | undefined {
  if (jobs.length === 0) return undefined;
  const chosen = [...jobs].sort((left, right) =>
    (right.updatedAt ?? right.createdAt ?? "").localeCompare(left.updatedAt ?? left.createdAt ?? ""),
  )[0];
  return chosen ? `/dashboard/jobs/${encodeURIComponent(chosen.id)}` : undefined;
}
