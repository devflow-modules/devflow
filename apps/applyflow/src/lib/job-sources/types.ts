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
export const JOB_SEARCH_MAX_LIMIT = 25;
export const JOB_SEARCH_DEFAULT_LIMIT = 10;

/** Provider-independent search input. Jobgether enums stay inside the adapter. */
export type JobSearchCriteria = {
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
 * `sourceUrl` is the provider listing, not an employer application URL.
 */
export type JobSearchHit = {
  externalId: string;
  source: "jobgether";
  title: string;
  company?: string;
  description?: string;
  location?: string;
  sourceUrl: string;
  remote?: string;
  contractType?: string;
  experience?: string;
  salaryRange?: string;
  postedAt?: string;
};

export type JobSearchPage = {
  provider: "jobgether";
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
] as const;

export type JobSourceErrorCode = (typeof JOB_SOURCE_ERROR_CODES)[number];

export type JobSourceFailure = {
  ok: false;
  error: JobSourceErrorCode;
};

export type JobSourceProvider = {
  readonly id: "jobgether";
  search(criteria: JobSearchCriteria): Promise<{ ok: true; page: JobSearchPage } | JobSourceFailure>;
};

export type DiscoveredJobSaveStatus =
  | "added"
  | "duplicate"
  | "missing_description"
  | "needs_resume"
  | "error";
