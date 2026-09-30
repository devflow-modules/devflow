import { createHash } from "node:crypto";

import type { JobSearchCriteria, JobSearchPage } from "./types";

export const JOB_SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
export const JOB_SEARCH_CACHE_MAX_ENTRIES = 50;

function normalizedCriteriaPayload(criteria: JobSearchCriteria): Record<string, string | number> {
  const payload: Record<string, string | number> = {
    page: criteria.page,
    limit: criteria.limit,
  };
  const keyword = criteria.keyword?.trim().toLowerCase().replace(/\s+/g, " ");
  if (keyword) payload.keyword = keyword;
  const location = criteria.location?.trim().toLowerCase().replace(/\s+/g, " ");
  if (location) payload.location = location;
  if (criteria.experience) payload.experience = criteria.experience;
  if (criteria.remote) payload.remote = criteria.remote;
  if (criteria.contract) payload.contract = criteria.contract;
  if (criteria.salaryMin != null) payload.salaryMin = criteria.salaryMin;
  if (criteria.salaryMax != null) payload.salaryMax = criteria.salaryMax;
  if (criteria.currency) payload.currency = criteria.currency;
  if (criteria.sort) payload.sort = criteria.sort;
  return payload;
}

export function hashJobSearchCriteria(criteria: JobSearchCriteria): string {
  return createHash("sha256").update(JSON.stringify(normalizedCriteriaPayload(criteria))).digest("hex").slice(0, 16);
}

/** Provider + normalized criteria + page. Page is outside the hash payload's identity only via this suffix. */
export function jobSearchCacheKey(criteria: JobSearchCriteria): string {
  const withoutPage: JobSearchCriteria = { ...criteria, page: 1 };
  return `jobgether:${hashJobSearchCriteria(withoutPage)}:page:${criteria.page}`;
}

type CacheEntry = {
  value: JobSearchPage;
  storedAt: number;
};

export type JobSearchCache = {
  get(key: string): JobSearchPage | undefined;
  set(key: string, value: JobSearchPage): void;
  size(): number;
};

export function createJobSearchCache(options?: {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}): JobSearchCache {
  const ttlMs = options?.ttlMs ?? JOB_SEARCH_CACHE_TTL_MS;
  const maxEntries = options?.maxEntries ?? JOB_SEARCH_CACHE_MAX_ENTRIES;
  const now = options?.now ?? Date.now;
  const entries = new Map<string, CacheEntry>();

  function purgeExpired(at: number) {
    for (const [key, entry] of entries) {
      if (at - entry.storedAt >= ttlMs) entries.delete(key);
    }
  }

  return {
    get(key) {
      const at = now();
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (at - entry.storedAt >= ttlMs) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      const at = now();
      purgeExpired(at);
      if (entries.has(key)) entries.delete(key);
      entries.set(key, { value, storedAt: at });
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
    },
    size() {
      return entries.size;
    },
  };
}
