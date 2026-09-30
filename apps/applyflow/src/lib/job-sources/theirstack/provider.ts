import type { JobSearchCriteria, JobSearchPage, JobSourceFailure, JobSourceProvider } from "../types";
import { THEIRSTACK_POSTED_AT_MAX_AGE_DAYS } from "../types";
import { normalizeTheirStackJob } from "./normalize";
import { parseTheirStackSuccess } from "./schema";
import { translateTheirStackCriteria } from "./translate";

export const THEIRSTACK_JOBS_SEARCH_URL = "https://api.theirstack.com/v1/jobs/search";
export const THEIRSTACK_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_CHARS = 1_500_000;

export type TheirStackProviderOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  apiKey?: string | null;
  postedAtMaxAgeDays?: number;
};

function failure(error: JobSourceFailure["error"]): JobSourceFailure {
  return { ok: false, error };
}

type ClassifiedFailure = JobSourceFailure & { retryable: boolean };

function classifyHttpFailure(status: number): ClassifiedFailure {
  if (status === 429) return { ...failure("provider_rate_limited"), retryable: false };
  if (status === 401 || status === 403) return { ...failure("provider_not_configured"), retryable: false };
  // Credits/billing exhaustion: surface as unavailable, never retry (avoids spending more credits).
  if (status === 402) return { ...failure("provider_unavailable"), retryable: false };
  if (status === 400 || status === 404 || status === 422) return { ...failure("provider_rejected"), retryable: false };
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

function resolveApiKey(options: TheirStackProviderOptions): string | null {
  if (options.apiKey !== undefined) {
    const trimmed = options.apiKey?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  }
  const fromEnv = process.env.THEIRSTACK_API_KEY?.trim() ?? "";
  return fromEnv.length > 0 ? fromEnv : null;
}

export function createTheirStackProvider(options: TheirStackProviderOptions = {}): JobSourceProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? THEIRSTACK_TIMEOUT_MS;
  const postedAtMaxAgeDays = options.postedAtMaxAgeDays ?? THEIRSTACK_POSTED_AT_MAX_AGE_DAYS;

  async function attempt(
    criteria: JobSearchCriteria,
  ): Promise<({ ok: true; page: JobSearchPage } | JobSourceFailure) & { retryable: boolean }> {
    const apiKey = resolveApiKey(options);
    if (!apiKey) return { ...failure("provider_not_configured"), retryable: false };

    const body = translateTheirStackCriteria(criteria, postedAtMaxAgeDays);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(THEIRSTACK_JOBS_SEARCH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const parsedBody = await readJson(response);
      if (parsedBody === "too_large" || parsedBody === "invalid_json") {
        if (response.ok) return { ...failure("invalid_provider_response"), retryable: false };
        return classifyHttpFailure(response.status);
      }
      if (!response.ok) return classifyHttpFailure(response.status);

      const parsed = parseTheirStackSuccess(parsedBody);
      if (!parsed) return { ...failure("invalid_provider_response"), retryable: false };

      const hits = parsed.data.flatMap((job) => {
        const hit = normalizeTheirStackJob(job);
        return hit ? [hit] : [];
      });

      const hasMore =
        hits.length >= criteria.limit ||
        (typeof parsed.metadata?.truncated_results === "number" && parsed.metadata.truncated_results > 0);

      return {
        ok: true,
        retryable: false,
        page: {
          provider: "theirstack",
          page: criteria.page,
          limit: criteria.limit,
          hasMore,
          hits,
        },
      };
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      return { ...failure(aborted ? "provider_timeout" : "provider_unavailable"), retryable: aborted };
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    id: "theirstack",
    async search(criteria) {
      let last: JobSourceFailure = failure("provider_unavailable");
      for (let attemptIndex = 0; attemptIndex < 2; attemptIndex += 1) {
        const outcome = await attempt(criteria);
        if (outcome.ok) {
          return {
            ok: true as const,
            page: outcome.page,
          };
        }
        last = { ok: false, error: outcome.error };
        // Credits are charged on successful returned jobs. Never retry client/auth/quota/rate-limit.
        if (!outcome.retryable) return last;
      }
      return last;
    },
  };
}
