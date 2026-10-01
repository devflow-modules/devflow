import { hashJobSearchCriteria, jobSearchCacheKey, providerCacheTtlMs, type JobSearchCache } from "./cache";
import { parseJobSearchCriteria } from "./criteria";
import type { JobSearchLogger } from "./log";
import { consumeTheirStackAccountQuota, type TheirStackQuotaResult } from "./theirstack-quota";
import type { JobSearchPage, JobSourceErrorCode, JobSourceId, JobSourceProvider } from "./types";
import { isJobSourceId } from "./types";

export type JobSearchExecution =
  | { ok: true; page: JobSearchPage; cached: boolean }
  | { ok: false; error: JobSourceErrorCode };

function httpStatusFor(error: JobSourceErrorCode): number {
  switch (error) {
    case "invalid_criteria":
      return 400;
    case "auth_required":
      return 401;
    case "provider_not_available":
      return 403;
    case "provider_rate_limited":
    case "app_rate_limited":
      return 429;
    case "provider_timeout":
      return 504;
    case "provider_unavailable":
    case "provider_not_configured":
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

export type JobSearchAccessContext = {
  /** Server-derived Supabase subject. Never from request body. */
  authProviderSub?: string | null;
  /** When true, anonymous free-provider search is allowed (auth not configured). */
  allowAnonymousFreeProviders?: boolean;
  /** Gate from theirstack-access (shared deploy default OFF). */
  theirStackEnabled?: boolean;
  /** Injected for tests. Defaults to process-local account quota. */
  consumeTheirStackQuota?: (authProviderSub: string) => TheirStackQuotaResult;
};

export type ExecuteJobSearchDeps = {
  /** Single provider — used when providers map is absent (Jobgether Phase 1 compat). */
  provider?: JobSourceProvider;
  /** Multi-provider registry keyed by JobSourceId. */
  providers?: Partial<Record<JobSourceId, JobSourceProvider>>;
  cache: JobSearchCache;
  log?: JobSearchLogger;
  now?: () => number;
  access?: JobSearchAccessContext;
};

function resolveProvider(criteriaProvider: JobSourceId, deps: ExecuteJobSearchDeps): JobSourceProvider | null {
  if (deps.providers?.[criteriaProvider]) return deps.providers[criteriaProvider]!;
  if (deps.provider && deps.provider.id === criteriaProvider) return deps.provider;
  if (deps.provider && !deps.providers) return deps.provider;
  return null;
}

function authorizeBeforeProvider(
  provider: JobSourceId,
  access: JobSearchAccessContext | undefined,
): JobSourceErrorCode | null {
  if (!access) return null;
  const subject = access.authProviderSub?.trim() || null;
  if (provider === "theirstack") {
    if (!subject) return "auth_required";
    if (access.theirStackEnabled === false) return "provider_not_available";
    return null;
  }
  if (!subject && access.allowAnonymousFreeProviders === false) {
    return "auth_required";
  }
  return null;
}

export async function executeJobSearch(raw: unknown, deps: ExecuteJobSearchDeps): Promise<JobSearchExecution> {
  const started = deps.now?.() ?? Date.now();
  const criteria = parseJobSearchCriteria(raw);
  if (!criteria) {
    const guessed =
      raw && typeof raw === "object" && "provider" in raw && isJobSourceId((raw as { provider: unknown }).provider)
        ? (raw as { provider: JobSourceId }).provider
        : "unknown";
    deps.log?.({
      event: "job_search_failed",
      provider: guessed,
      criteriaHash: "invalid",
      page: 0,
      cache: "miss",
      durationMs: Math.max(0, (deps.now?.() ?? Date.now()) - started),
      errorCode: "invalid_criteria",
      upstream: "no",
    });
    return { ok: false, error: "invalid_criteria" };
  }

  const authError = authorizeBeforeProvider(criteria.provider, deps.access);
  if (authError) {
    deps.log?.({
      event: "job_search_failed",
      provider: criteria.provider,
      criteriaHash: hashJobSearchCriteria({ ...criteria, page: 1 }),
      page: criteria.page,
      cache: "miss",
      durationMs: Math.max(0, (deps.now?.() ?? Date.now()) - started),
      errorCode: authError,
      upstream: "no",
      quota: "deny",
    });
    return { ok: false, error: authError };
  }

  const provider = resolveProvider(criteria.provider, deps);
  if (!provider) {
    deps.log?.({
      event: "job_search_failed",
      provider: criteria.provider,
      criteriaHash: hashJobSearchCriteria({ ...criteria, page: 1 }),
      page: criteria.page,
      cache: "miss",
      durationMs: Math.max(0, (deps.now?.() ?? Date.now()) - started),
      errorCode: "provider_unavailable",
      upstream: "no",
    });
    return { ok: false, error: "provider_unavailable" };
  }

  const key = jobSearchCacheKey(criteria);
  const criteriaHash = hashJobSearchCriteria({ ...criteria, page: 1 });
  const cached = deps.cache.get(key);
  if (cached) {
    deps.log?.({
      event: "job_search_completed",
      provider: criteria.provider,
      criteriaHash,
      page: criteria.page,
      resultCount: cached.hits.length,
      cache: "hit",
      durationMs: Math.max(0, (deps.now?.() ?? Date.now()) - started),
      upstream: "no",
      quota: "skip_cache",
    });
    return { ok: true, page: cached, cached: true };
  }

  if (criteria.provider === "theirstack" && deps.access) {
    const subject = deps.access.authProviderSub?.trim();
    if (!subject) {
      return { ok: false, error: "auth_required" };
    }
    const consume = deps.access.consumeTheirStackQuota ?? consumeTheirStackAccountQuota;
    const quota = consume(subject);
    if (!quota.ok) {
      deps.log?.({
        event: "job_search_failed",
        provider: criteria.provider,
        criteriaHash,
        page: criteria.page,
        cache: "miss",
        durationMs: Math.max(0, (deps.now?.() ?? Date.now()) - started),
        errorCode: "app_rate_limited",
        upstream: "no",
        quota: "deny",
      });
      return { ok: false, error: "app_rate_limited" };
    }
  }

  const result = await provider.search(criteria);
  const durationMs = Math.max(0, (deps.now?.() ?? Date.now()) - started);
  if (!result.ok) {
    deps.log?.({
      event: "job_search_failed",
      provider: criteria.provider,
      criteriaHash,
      page: criteria.page,
      cache: "miss",
      durationMs,
      errorCode: result.error,
      upstream: "yes",
      quota: criteria.provider === "theirstack" ? "allow" : undefined,
    });
    return result;
  }

  deps.cache.set(key, result.page, providerCacheTtlMs(criteria.provider));
  deps.log?.({
    event: "job_search_completed",
    provider: criteria.provider,
    criteriaHash,
    page: criteria.page,
    resultCount: result.page.hits.length,
    cache: "miss",
    durationMs,
    upstream: "yes",
    quota: criteria.provider === "theirstack" ? "allow" : undefined,
  });
  return { ok: true, page: result.page, cached: false };
}
