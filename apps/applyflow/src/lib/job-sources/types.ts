export const JOB_SOURCE_IDS = ["jobgether", "theirstack"] as const;
export type JobSourceId = (typeof JOB_SOURCE_IDS)[number];

export const DEFAULT_JOB_SOURCE_ID: JobSourceId = "jobgether";

export type JobSourceCapabilities = {
  fullDescription: boolean;
};

export const JOB_SOURCE_CAPABILITIES: Record<JobSourceId, JobSourceCapabilities> = {
  jobgether: { fullDescription: false },
  theirstack: { fullDescription: true },
};

export const JOB_SEARCH_EXPERIENCE = ["entry", "junior", "mid", "senior", "expert"] as const;
export type JobSearchExperience = (typeof JOB_SEARCH_EXPERIENCE)[number];

export const JOB_SEARCH_REMOTE = ["full_remote", "remote_first", "hybrid", "include_hybrid"] as const;
export type JobSearchRemote = (typeof JOB_SEARCH_REMOTE)[number];

export const JOB_SEARCH_CONTRACT = [
  "full_time",
  "part_time",
  "fixed_term",
  "freelance",
  "internship",
] as const;
export type JobSearchContract = (typeof JOB_SEARCH_CONTRACT)[number];

export const JOB_SEARCH_SORT = ["relevance", "date"] as const;
export type JobSearchSort = (typeof JOB_SEARCH_SORT)[number];

export const JOB_SEARCH_MAX_PAGE = 10;

/** Absolute Zod ceiling; provider adapters enforce tighter limits server-side. */
export const JOB_SEARCH_ABSOLUTE_MAX_LIMIT = 25;
/** @deprecated Prefer providerMaxLimit(provider) — kept for existing imports. */
export const JOB_SEARCH_MAX_LIMIT = JOB_SEARCH_ABSOLUTE_MAX_LIMIT;

export const JOBGETHER_DEFAULT_LIMIT = 10;
export const JOBGETHER_MAX_LIMIT = 25;

export const THEIRSTACK_DEFAULT_LIMIT = 5;
export const THEIRSTACK_MAX_LIMIT = 10;
export const THEIRSTACK_POSTED_AT_MAX_AGE_DAYS = 30;

export const JOB_SEARCH_DEFAULT_LIMIT = JOBGETHER_DEFAULT_LIMIT;

/** Provider-independent search input. Provider enums stay inside adapters. */
export type JobSearchCriteria = {
  provider: JobSourceId;
  keyword?: string;
  location?: string;
  experience?: JobSearchExperience;
  remote?: JobSearchRemote;
  contract?: JobSearchContract;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  sort?: JobSearchSort;
  page: number;
  limit: number;
};

/**
 * Normalized discovery hit. This is not an ApplyFlowJob and not an application.
 * `sourceUrl` is the provider/board listing URL, not necessarily a direct apply URL.
 * `directApplyUrl` is optional employer/ATS URL when the provider supplies one.
 */
export type JobSearchHit = {
  externalId: string;
  source: JobSourceId;
  title: string;
  company?: string;
  description?: string;
  location?: string;
  sourceUrl: string;
  directApplyUrl?: string;
  remote?: string;
  contractType?: string;
  experience?: string;
  salaryRange?: string;
  technologies?: string[];
  postedAt?: string;
};

export type JobSearchPage = {
  provider: JobSourceId;
  page: number;
  limit: number;
  hasMore: boolean;
  hits: JobSearchHit[];
};

export const JOB_SOURCE_ERROR_CODES = [
  "invalid_criteria",
  "provider_rejected",
  "provider_timeout",
  "provider_rate_limited",
  "provider_unavailable",
  "invalid_provider_response",
  "provider_not_configured",
] as const;

export type JobSourceErrorCode = (typeof JOB_SOURCE_ERROR_CODES)[number];

export type JobSourceFailure = {
  ok: false;
  error: JobSourceErrorCode;
};

export type JobSourceProvider = {
  readonly id: JobSourceId;
  search(criteria: JobSearchCriteria): Promise<{ ok: true; page: JobSearchPage } | JobSourceFailure>;
};

export type DiscoveredJobSaveStatus =
  | "added"
  | "duplicate"
  | "missing_description"
  | "needs_resume"
  | "error";

export function isJobSourceId(value: unknown): value is JobSourceId {
  return typeof value === "string" && (JOB_SOURCE_IDS as readonly string[]).includes(value);
}

export function providerDefaultLimit(provider: JobSourceId): number {
  return provider === "theirstack" ? THEIRSTACK_DEFAULT_LIMIT : JOBGETHER_DEFAULT_LIMIT;
}

export function providerMaxLimit(provider: JobSourceId): number {
  return provider === "theirstack" ? THEIRSTACK_MAX_LIMIT : JOBGETHER_MAX_LIMIT;
}
