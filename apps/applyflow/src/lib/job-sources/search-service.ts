import { hashJobSearchCriteria, jobSearchCacheKey, type JobSearchCache } from "./cache";
import type { JobSearchLogger } from "./log";
import { parseJobSearchCriteria } from "./criteria";
import type { JobSearchPage, JobSourceErrorCode, JobSourceProvider } from "./types";

export type JobSearchExecution =
  | { ok: true; page: JobSearchPage; cached: boolean }
  | { ok: false; error: JobSourceErrorCode };

function httpStatusFor(error: JobSourceErrorCode): number {
  switch (error) {
    case "invalid_criteria":
      return 400;
    case "provider_rate_limited":
      return 429;
    case "provider_timeout":
      return 504;
    case "provider_unavailable":
      return 503;
    case "provider_rejected":
    case "invalid_provider_response":
      return 502;
    default:
      return 502;
  }
}

export function jobSearchHttpStatus(error: JobSourceErrorCode): number {
  return httpStatusFor(error);
}

export async function executeJobSearch(
  raw: unknown,
  deps: {
    provider: JobSourceProvider;
    cache: JobSearchCache;
    log?: JobSearchLogger;
    now?: () => number;
  },
): Promise<JobSearchExecution> {
  const started = deps.now?.() ?? Date.now();
  const criteria = parseJobSearchCriteria(raw);
  if (!criteria) {
    deps.log?.({
      event: "job_search_failed",
      provider: "jobgether",
      criteriaHash: "invalid",
      page: 0,
      cache: "miss",
      durationMs: Math.max(0, (deps.now?.() ?? Date.now()) - started),
      errorCode: "invalid_criteria",
    });
    return { ok: false, error: "invalid_criteria" };
  }

  const key = jobSearchCacheKey(criteria);
  const criteriaHash = hashJobSearchCriteria({ ...criteria, page: 1 });
  const cached = deps.cache.get(key);
  if (cached) {
    deps.log?.({
      event: "job_search_completed",
      provider: "jobgether",
      criteriaHash,
      page: criteria.page,
      resultCount: cached.hits.length,
      cache: "hit",
      durationMs: Math.max(0, (deps.now?.() ?? Date.now()) - started),
    });
    return { ok: true, page: cached, cached: true };
  }

  const result = await deps.provider.search(criteria);
  const durationMs = Math.max(0, (deps.now?.() ?? Date.now()) - started);
  if (!result.ok) {
    deps.log?.({
      event: "job_search_failed",
      provider: "jobgether",
      criteriaHash,
      page: criteria.page,
      cache: "miss",
      durationMs,
      errorCode: result.error,
    });
    return result;
  }

  deps.cache.set(key, result.page);
  deps.log?.({
    event: "job_search_completed",
    provider: "jobgether",
    criteriaHash,
    page: criteria.page,
    resultCount: result.page.hits.length,
    cache: "miss",
    durationMs,
  });
  return { ok: true, page: result.page, cached: false };
}
