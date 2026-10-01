import type { JobSearchHit } from "../types";
import { REMOTEOK_CATALOG_TTL_MS } from "../types";

export type RemoteOkCatalogSnapshot = {
  hits: JobSearchHit[];
  fetchedAt: number;
};

export type RemoteOkCatalogCache = {
  get(): RemoteOkCatalogSnapshot | undefined;
  set(hits: JobSearchHit[]): void;
  clear(): void;
  size(): number;
};

/**
 * Process-local Remote OK catalog cache.
 * Serverless instances do not share this map.
 * Failed refreshes are never stored.
 */
export function createRemoteOkCatalogCache(options?: {
  ttlMs?: number;
  now?: () => number;
}): RemoteOkCatalogCache {
  const ttlMs = options?.ttlMs ?? REMOTEOK_CATALOG_TTL_MS;
  const now = options?.now ?? Date.now;
  let snapshot: RemoteOkCatalogSnapshot | undefined;

  return {
    get() {
      if (!snapshot) return undefined;
      if (now() - snapshot.fetchedAt >= ttlMs) {
        snapshot = undefined;
        return undefined;
      }
      return snapshot;
    },
    set(hits) {
      // Bound: keep a shallow copy of the normalized catalog only (typically ~100 jobs).
      snapshot = { hits: hits.slice(0, 500), fetchedAt: now() };
    },
    clear() {
      snapshot = undefined;
    },
    size() {
      return snapshot?.hits.length ?? 0;
    },
  };
}
