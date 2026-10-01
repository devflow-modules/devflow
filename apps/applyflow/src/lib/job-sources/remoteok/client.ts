import type { JobSearchHit, JobSourceFailure } from "../types";
import { normalizeRemoteOkJob } from "./normalize";
import { parseRemoteOkCatalog } from "./schema";

export const REMOTEOK_API_URL = "https://remoteok.com/api";
export const REMOTEOK_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_CHARS = 2_000_000;

export type RemoteOkFetchDeps = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

function failure(error: JobSourceFailure["error"]): JobSourceFailure {
  return { ok: false, error };
}

type ClassifiedFailure = JobSourceFailure & { retryable: boolean };

function classifyHttpFailure(status: number): ClassifiedFailure {
  if (status === 429) return { ...failure("provider_rate_limited"), retryable: false };
  if (status === 400 || status === 403 || status === 404) {
    return { ...failure("provider_rejected"), retryable: false };
  }
  if (status === 504) return { ...failure("provider_timeout"), retryable: true };
  if (status >= 500) return { ...failure("provider_unavailable"), retryable: true };
  return { ...failure("provider_rejected"), retryable: false };
}

async function readJson(response: Response): Promise<unknown | "too_large" | "invalid_json"> {
  const text = await response.text();
  if (text.length > MAX_RESPONSE_CHARS) return "too_large";
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return "invalid_json";
  }
}

export type RemoteOkCatalogLoadResult =
  | { ok: true; hits: JobSearchHit[]; retryable: false }
  | (JobSourceFailure & { retryable: boolean });

/**
 * Fixed-host GET of the Remote OK public JSON feed.
 * No secrets. No arbitrary URLs.
 */
export async function fetchRemoteOkCatalog(deps: RemoteOkFetchDeps = {}): Promise<RemoteOkCatalogLoadResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? REMOTEOK_TIMEOUT_MS;

  const url = new URL(REMOTEOK_API_URL);
  if (url.origin !== "https://remoteok.com" || url.pathname !== "/api") {
    return { ...failure("provider_rejected"), retryable: false };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const body = await readJson(response);
    if (body === "too_large" || body === "invalid_json") {
      if (response.ok) return { ...failure("invalid_provider_response"), retryable: false };
      return classifyHttpFailure(response.status);
    }
    if (!response.ok) return classifyHttpFailure(response.status);

    const parsed = parseRemoteOkCatalog(body);
    if (!parsed) return { ...failure("invalid_provider_response"), retryable: false };

    const hits = parsed.jobs.flatMap((job) => {
      const hit = normalizeRemoteOkJob(job);
      return hit ? [hit] : [];
    });

    if (hits.length === 0) return { ...failure("invalid_provider_response"), retryable: false };
    return { ok: true, hits, retryable: false };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return { ...failure(aborted ? "provider_timeout" : "provider_unavailable"), retryable: aborted };
  } finally {
    clearTimeout(timeout);
  }
}
