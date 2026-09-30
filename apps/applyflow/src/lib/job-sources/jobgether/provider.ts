import type { JobSearchCriteria, JobSearchPage, JobSourceFailure, JobSourceProvider } from "../types";
import { normalizeJobgetherJob } from "./normalize";
import { parseJobgetherProblem, parseJobgetherSuccess } from "./schema";
import { translateJobSearchCriteria } from "./translate";

export const JOBGETHER_JOBS_URL = "https://jobgether.com/api/v1/jobs";
export const JOBGETHER_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_CHARS = 1_000_000;

const RETRYABLE = new Set<JobSourceFailure["error"]>(["provider_timeout", "provider_unavailable"]);

export type JobgetherProviderOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

function failure(error: JobSourceFailure["error"]): JobSourceFailure {
  return { ok: false, error };
}

function classifyHttpFailure(status: number, body: unknown): JobSourceFailure {
  const problem = parseJobgetherProblem(body);
  if (status === 429) return failure("provider_rate_limited");
  if (
    status === 400 ||
    status === 404 ||
    problem?.code === "invalid_parameter" ||
    problem?.code === "invalid_body" ||
    problem?.code === "not_found"
  ) {
    return failure("provider_rejected");
  }
  if (status === 504 || problem?.code === "timeout") return failure("provider_timeout");
  if (status >= 500) return failure("provider_unavailable");
  return failure("provider_rejected");
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

export function createJobgetherProvider(options: JobgetherProviderOptions = {}): JobSourceProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? JOBGETHER_TIMEOUT_MS;

  async function attempt(criteria: JobSearchCriteria): Promise<{ ok: true; page: JobSearchPage } | JobSourceFailure> {
    const url = new URL(JOBGETHER_JOBS_URL);
    const params = translateJobSearchCriteria(criteria);
    for (const [key, value] of params) url.searchParams.set(key, value);
    if (url.origin !== "https://jobgether.com" || url.pathname !== "/api/v1/jobs") {
      return failure("provider_rejected");
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
        return response.ok ? failure("invalid_provider_response") : classifyHttpFailure(response.status, undefined);
      }
      if (!response.ok) return classifyHttpFailure(response.status, body);
      const parsed = parseJobgetherSuccess(body);
      if (!parsed) return failure("invalid_provider_response");
      return {
        ok: true,
        page: {
          provider: "jobgether",
          page: parsed.pagination.page,
          limit: parsed.pagination.limit,
          hasMore: parsed.pagination.hasMore,
          hits: parsed.jobs.flatMap((job) => {
            const hit = normalizeJobgetherJob(job);
            return hit ? [hit] : [];
          }),
        },
      };
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      return failure(aborted ? "provider_timeout" : "provider_unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    id: "jobgether",
    async search(criteria) {
      let last: JobSourceFailure = failure("provider_unavailable");
      for (let attemptIndex = 0; attemptIndex < 2; attemptIndex += 1) {
        const outcome = await attempt(criteria);
        if (outcome.ok) return outcome;
        last = outcome;
        if (!RETRYABLE.has(outcome.error)) return outcome;
      }
      return last;
    },
  };
}
