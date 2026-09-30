import { describe, expect, it, vi } from "vitest";

import { createJobSearchCache, jobSearchCacheKey, THEIRSTACK_CACHE_TTL_MS } from "./cache";
import { parseJobSearchCriteria } from "./criteria";
import { createExternalJobId } from "./save-hit";
import { executeJobSearch } from "./search-service";
import { normalizeTheirStackJob } from "./theirstack/normalize";
import { createTheirStackProvider, THEIRSTACK_JOBS_SEARCH_URL } from "./theirstack/provider";
import { parseTheirStackSuccess } from "./theirstack/schema";
import { translateTheirStackCriteria } from "./theirstack/translate";
import type { JobSearchCriteria, JobSourceProvider } from "./types";

const listingUrl = "https://www.linkedin.com/jobs/view/123456";
const atsUrl = "https://boards.greenhouse.io/acme/jobs/999";

const validJob = {
  id: 424242,
  job_title: "Senior Software Engineer",
  company: "Acme Latam",
  description: "Full description. React, TypeScript, Node.js and PostgreSQL. Remote Brazil.",
  url: listingUrl,
  source_url: listingUrl,
  final_url: atsUrl,
  country: "Brazil",
  country_code: "BR",
  city: "São Paulo",
  seniority: "senior",
  employment_statuses: ["full_time"],
  remote: true,
  hybrid: false,
  min_annual_salary: 0,
  max_annual_salary: 0,
  technology_slugs: ["react", "typescript", "postgresql"],
  date_posted: "2026-09-01T00:00:00.000Z",
};

const validPayload = {
  data: [validJob],
  metadata: { total_results: null, truncated_results: 0 },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const baseCriteria: JobSearchCriteria = {
  provider: "theirstack",
  keyword: "software engineer",
  location: "Brazil",
  experience: "senior",
  remote: "full_remote",
  page: 1,
  limit: 5,
};

describe("TheirStack validation and normalization", () => {
  it("accepts a valid payload with full description and maps URLs", () => {
    const parsed = parseTheirStackSuccess(validPayload);
    expect(parsed).not.toBeNull();
    const hit = normalizeTheirStackJob(parsed!.data[0]!);
    expect(hit).toMatchObject({
      externalId: "424242",
      source: "theirstack",
      title: "Senior Software Engineer",
      company: "Acme Latam",
      description: validJob.description,
      sourceUrl: listingUrl,
      directApplyUrl: atsUrl,
      remote: "remote",
      technologies: ["react", "typescript", "postgresql"],
    });
    expect(hit?.salaryRange).toBeUndefined();
    expect(JSON.stringify(hit)).not.toContain("blur_company_data");
    expect(hit).not.toHaveProperty("final_url");
    expect(hit).not.toHaveProperty("source_url");
  });

  it("keeps a hit without description and omits salary zeros", () => {
    const hit = normalizeTheirStackJob({
      ...validJob,
      description: "   ",
      final_url: null,
      technology_slugs: [],
    });
    expect(hit?.description).toBeUndefined();
    expect(hit?.directApplyUrl).toBeUndefined();
    expect(hit?.salaryRange).toBeUndefined();
  });

  it("rejects an invalid provider payload", () => {
    expect(parseTheirStackSuccess({ data: [{ id: 1 }] })).toBeNull();
    expect(parseTheirStackSuccess({ unexpected: true })).toBeNull();
  });

  it("builds a stable job_ts_ id", () => {
    expect(createExternalJobId("theirstack", "424242")).toBe("job_ts_424242");
  });
});

describe("TheirStack criteria translation", () => {
  it("includes temporal filter, is_closed, and maps ApplyFlow criteria", () => {
    const body = translateTheirStackCriteria(baseCriteria, 30);
    expect(body.page).toBe(0);
    expect(body.limit).toBe(5);
    expect(body.posted_at_max_age_days).toBe(30);
    expect(body.is_closed).toBe(false);
    expect(body.job_title_or).toEqual(["software engineer"]);
    expect(body.job_description_pattern_or).toEqual(["software engineer"]);
    expect(body.job_country_code_or).toEqual(["BR"]);
    expect(body.workplace_types_or).toEqual(["remote"]);
    expect(body.job_seniority_or).toEqual(["senior"]);
    expect(JSON.stringify(body)).not.toContain("cv");
    expect(JSON.stringify(body)).not.toContain("resume");
  });

  it("maps page 2 to TheirStack page 1", () => {
    expect(translateTheirStackCriteria({ ...baseCriteria, page: 2 }, 30).page).toBe(1);
  });
});

describe("TheirStack provider resilience", () => {
  it("POSTs to the fixed host with Bearer auth and default limit 5", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(THEIRSTACK_JOBS_SEARCH_URL);
      expect(init?.method).toBe("POST");
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer test-key");
      expect(headers.get("Content-Type")).toBe("application/json");
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.limit).toBe(5);
      expect(body.posted_at_max_age_days).toBe(30);
      expect(body.is_closed).toBe(false);
      expect(JSON.stringify(body)).not.toContain("cv");
      return jsonResponse(validPayload);
    });
    const provider = createTheirStackProvider({ fetchImpl, apiKey: "test-key" });
    const result = await provider.search(baseCriteria);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.page.provider).toBe("theirstack");
    expect(result.page.hits[0]?.source).toBe("theirstack");
    expect(result.page.hits[0]?.description).toContain("Full description");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("fails closed when API key is missing", async () => {
    const fetchImpl = vi.fn();
    const provider = createTheirStackProvider({ fetchImpl, apiKey: null });
    const result = await provider.search(baseCriteria);
    expect(result).toEqual({ ok: false, error: "provider_not_configured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not retry 429 or 402", async () => {
    const rate = vi.fn(async () => jsonResponse({ error: "rate" }, 429));
    const quota = vi.fn(async () => jsonResponse({ error: "quota" }, 402));
    expect(await createTheirStackProvider({ fetchImpl: rate, apiKey: "k" }).search(baseCriteria)).toEqual({
      ok: false,
      error: "provider_rate_limited",
    });
    expect(await createTheirStackProvider({ fetchImpl: quota, apiKey: "k" }).search(baseCriteria)).toEqual({
      ok: false,
      error: "provider_unavailable",
    });
    expect(rate).toHaveBeenCalledTimes(1);
    expect(quota).toHaveBeenCalledTimes(1);
  });

  it("retries a 5xx response at most once", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
      .mockResolvedValueOnce(jsonResponse(validPayload, 200));
    const provider = createTheirStackProvider({ fetchImpl, apiKey: "k" });
    const result = await provider.search(baseCriteria);
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("retries a timeout at most once", async () => {
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        const abort = () => {
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          reject(error);
        };
        if (!signal) {
          abort();
          return;
        }
        if (signal.aborted) abort();
        else signal.addEventListener("abort", abort, { once: true });
      });
    });
    const provider = createTheirStackProvider({ fetchImpl, apiKey: "k", timeoutMs: 15 });
    const result = await provider.search(baseCriteria);
    expect(result).toEqual({ ok: false, error: "provider_timeout" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("TheirStack search service limits and cache", () => {
  it("defaults TheirStack limit to 5 and rejects limit above 10", async () => {
    const search = vi.fn(async (criteria: JobSearchCriteria) => ({
      ok: true as const,
      page: {
        provider: "theirstack" as const,
        page: criteria.page,
        limit: criteria.limit,
        hasMore: false,
        hits: [],
      },
    }));
    const providers = { theirstack: { id: "theirstack" as const, search } };
    const cache = createJobSearchCache();
    const ok = await executeJobSearch({ provider: "theirstack", page: 1 }, { providers, cache });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.page.limit).toBe(5);
    expect(search.mock.calls[0]?.[0].limit).toBe(5);

    const tooMany = await executeJobSearch(
      { provider: "theirstack", page: 1, limit: 11 },
      { providers, cache },
    );
    expect(tooMany).toEqual({ ok: false, error: "invalid_criteria" });
  });

  it("reuses cache for identical TheirStack query and isolates page/provider", async () => {
    const search = vi.fn(async (criteria: JobSearchCriteria) => ({
      ok: true as const,
      page: {
        provider: criteria.provider,
        page: criteria.page,
        limit: criteria.limit,
        hasMore: false,
        hits: [],
      },
    }));
    const providers: Partial<Record<"jobgether" | "theirstack", JobSourceProvider>> = {
      theirstack: { id: "theirstack", search },
      jobgether: { id: "jobgether", search },
    };
    const cache = createJobSearchCache();
    await executeJobSearch({ provider: "theirstack", keyword: "react", page: 1, limit: 5 }, { providers, cache });
    await executeJobSearch({ provider: "theirstack", keyword: "react", page: 1, limit: 5 }, { providers, cache });
    await executeJobSearch({ provider: "theirstack", keyword: "react", page: 2, limit: 5 }, { providers, cache });
    await executeJobSearch({ provider: "jobgether", keyword: "react", page: 1, limit: 5 }, { providers, cache });
    expect(search).toHaveBeenCalledTimes(3);
    expect(jobSearchCacheKey({ provider: "theirstack", keyword: "react", page: 1, limit: 5 })).not.toBe(
      jobSearchCacheKey({ provider: "jobgether", keyword: "react", page: 1, limit: 5 }),
    );
  });

  it("uses a longer TheirStack TTL than the default Jobgether window", () => {
    expect(THEIRSTACK_CACHE_TTL_MS).toBe(30 * 60 * 1000);
    let now = 1_000;
    const cache = createJobSearchCache({ now: () => now });
    const page = { provider: "theirstack" as const, page: 1, limit: 5, hasMore: false, hits: [] };
    cache.set("ts", page, THEIRSTACK_CACHE_TTL_MS);
    now = 1_000 + 10 * 60 * 1000 + 1;
    expect(cache.get("ts")).toEqual(page);
    now = 1_000 + THEIRSTACK_CACHE_TTL_MS + 1;
    expect(cache.get("ts")).toBeUndefined();
  });

  it("does not cache TheirStack errors", async () => {
    const search = vi.fn(async () => ({ ok: false as const, error: "provider_unavailable" as const }));
    const providers = { theirstack: { id: "theirstack" as const, search } };
    const cache = createJobSearchCache();
    await executeJobSearch({ provider: "theirstack", page: 1, limit: 5 }, { providers, cache });
    await executeJobSearch({ provider: "theirstack", page: 1, limit: 5 }, { providers, cache });
    expect(search).toHaveBeenCalledTimes(2);
  });

  it("parses TheirStack provider in criteria and never dual-defaults", () => {
    expect(parseJobSearchCriteria({ page: 1 })?.provider).toBe("jobgether");
    expect(parseJobSearchCriteria({ provider: "theirstack", page: 1 })?.provider).toBe("theirstack");
    expect(parseJobSearchCriteria({ provider: "evil", page: 1 })).toBeNull();
  });
});
