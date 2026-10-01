import type { JobSearchCriteria, JobSearchPage, JobSourceFailure, JobSourceProvider } from "../types";
import { REMOTEOK_CATALOG_TTL_MS } from "../types";
import { createRemoteOkCatalogCache, type RemoteOkCatalogCache } from "./catalog-cache";
import { fetchRemoteOkCatalog, REMOTEOK_TIMEOUT_MS, type RemoteOkFetchDeps } from "./client";
import { filterRemoteOkCatalog, paginateRemoteOkHits } from "./filter";
import type { JobSearchHit } from "../types";

export type RemoteOkProviderOptions = RemoteOkFetchDeps & {
  catalogCache?: RemoteOkCatalogCache;
  now?: () => number;
  ttlMs?: number;
};

function failure(error: JobSourceFailure["error"]): JobSourceFailure {
  return { ok: false, error };
}

/**
 * Remote OK JobSourceProvider facade.
 * Internally: load/cached catalog → local filter → local pagination.
 * One upstream /api fetch per TTL (process-local), coalesced across concurrent misses.
 */
export function createRemoteOkProvider(options: RemoteOkProviderOptions = {}): JobSourceProvider {
  const catalogCache = options.catalogCache ?? createRemoteOkCatalogCache({
    ttlMs: options.ttlMs ?? REMOTEOK_CATALOG_TTL_MS,
    now: options.now,
  });
  let inFlight: Promise<{ ok: true; hits: JobSearchHit[] } | JobSourceFailure> | null = null;

  async function loadCatalog(): Promise<{ ok: true; hits: JobSearchHit[] } | JobSourceFailure> {
    const cached = catalogCache.get();
    if (cached) return { ok: true, hits: cached.hits };

    if (inFlight) return inFlight;

    inFlight = (async () => {
      let last: JobSourceFailure = failure("provider_unavailable");
      for (let attemptIndex = 0; attemptIndex < 2; attemptIndex += 1) {
        const outcome = await fetchRemoteOkCatalog({
          fetchImpl: options.fetchImpl,
          timeoutMs: options.timeoutMs ?? REMOTEOK_TIMEOUT_MS,
        });
        if (outcome.ok) {
          catalogCache.set(outcome.hits);
          return { ok: true as const, hits: outcome.hits };
        }
        last = { ok: false, error: outcome.error };
        if (!outcome.retryable) return last;
      }
      return last;
    })();

    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  }

  return {
    id: "remoteok",
    async search(criteria: JobSearchCriteria) {
      const catalog = await loadCatalog();
      if (!catalog.ok) return catalog;

      const filtered = filterRemoteOkCatalog(catalog.hits, criteria);
      const { pageHits, hasMore } = paginateRemoteOkHits(filtered, criteria.page, criteria.limit);

      const page: JobSearchPage = {
        provider: "remoteok",
        page: criteria.page,
        limit: criteria.limit,
        hasMore,
        hits: pageHits,
      };
      return { ok: true, page };
    },
  };
}
