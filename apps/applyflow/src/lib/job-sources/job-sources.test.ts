import { describe, expect, it, vi } from "vitest";

import { createJobSearchCache, jobSearchCacheKey } from "./cache";
import { parseJobSearchCriteria } from "./criteria";
import { normalizeJobgetherJob } from "./jobgether/normalize";
import { createJobgetherProvider } from "./jobgether/provider";
import { parseJobgetherSuccess } from "./jobgether/schema";
import { translateJobSearchCriteria } from "./jobgether/translate";
import { executeJobSearch } from "./search-service";
import type { JobSearchCriteria, JobSourceProvider } from "./types";

const listingUrl = "https://jobgether.com/offer/65f1a2b3c4d5e6f7a8b9c0d1-senior-frontend";

const validPayload = {
  jobs: [
    {
      id: "65f1a2b3c4d5e6f7a8b9c0d1",
      title: "Senior Frontend Developer",
      company: "Acme Inc.",
      url: listingUrl,
      location: "Brazil",
      remote: "Full Remote",
      contractType: "Full time",
      experience: "Senior (5-10 years)",
      salaryRange: "60000-80000 USD",
      jobFunctions: ["Frontend Developer"],
      postedAt: "2026-07-01T00:00:00.000Z",
      description: "Senior product engineer. React, TypeScript, Node.js and PostgreSQL. Remote.",
      rawPayload: { secret: "do-not-keep" },
    },
  ],
  pagination: { page: 1, limit: 10, hasMore: true },
  browseOnSiteUrl: "https://jobgether.com/search-offers?keyword=frontend",
  docs: "/astroapi/ai/jobs/docs",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const baseCriteria: JobSearchCriteria = {
  provider: "jobgether",
  keyword: "full stack",
  experience: "senior",
  page: 1,
  limit: 10,
};

describe("Jobgether validation and normalization", () => {
  it("accepts a valid payload and drops unknown fields from the hit", () => {
    const parsed = parseJobgetherSuccess(validPayload);
    expect(parsed).not.toBeNull();
    const hit = normalizeJobgetherJob(parsed!.jobs[0]!);
    expect(hit).toEqual({
      externalId: "65f1a2b3c4d5e6f7a8b9c0d1",
      source: "jobgether",
      title: "Senior Frontend Developer",
      company: "Acme Inc.",
      description: "Senior product engineer. React, TypeScript, Node.js and PostgreSQL. Remote.",
      location: "Brazil",
      sourceUrl: listingUrl,
      remote: "Full Remote",
      contractType: "Full time",
      experience: "Senior (5-10 years)",
      salaryRange: "60000-80000 USD",
      postedAt: "2026-07-01T00:00:00.000Z",
    });
    expect(JSON.stringify(hit)).not.toContain("rawPayload");
    expect(JSON.stringify(hit)).not.toContain("do-not-keep");
    expect(JSON.stringify(hit)).not.toContain("browseOnSiteUrl");
    expect(hit).not.toHaveProperty("rawPayload");
  });

  it("rejects an invalid provider payload", () => {
    expect(parseJobgetherSuccess({ jobs: [{ id: "" }], pagination: { page: 1, limit: 1, hasMore: false } })).toBeNull();
    expect(parseJobgetherSuccess({ unexpected: true })).toBeNull();
  });

  it("keeps a hit without description and omits a non-http listing url", () => {
    const parsed = parseJobgetherSuccess({
      jobs: [
        {
          id: "abc123",
          title: "Backend Engineer",
          url: listingUrl,
          experience: "",
        },
        {
          id: "bad",
          title: "Skip",
          url: "javascript:alert(1)",
        },
      ],
      pagination: { page: 1, limit: 2, hasMore: false },
    });
    expect(parsed?.jobs).toHaveLength(2);
    const hits = parsed!.jobs.flatMap((job) => {
      const hit = normalizeJobgetherJob(job);
      return hit ? [hit] : [];
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.description).toBeUndefined();
    expect(hits[0]?.experience).toBeUndefined();
  });
});

describe("Jobgether criteria translation", () => {
  it("maps senior to senior-5-10-years and keeps page and limit", () => {
    const params = translateJobSearchCriteria({
      provider: "jobgether",
      keyword: "full stack",
      location: "São Paulo",
      experience: "senior",
      remote: "full_remote",
      contract: "full_time",
      salaryMin: 80000,
      salaryMax: 120000,
      currency: "USD",
      sort: "date",
      page: 2,
      limit: 25,
    });
    expect(params.get("experience")).toBe("senior-5-10-years");
    expect(params.get("locations")).toBe("sao-paulo");
    expect(params.get("remoteType")).toBe("full-remote");
    expect(params.get("contractType")).toBe("full-time");
    expect(params.get("salaryMin")).toBe("80000");
    expect(params.get("currency")).toBe("USD");
    expect(params.get("sort")).toBe("date");
    expect(params.get("page")).toBe("2");
    expect(params.get("limit")).toBe("25");
    expect(params.getAll("experience")).toEqual(["senior-5-10-years"]);
  });

  it("sends includeHybrid without a Jobgether remote enum", () => {
    const params = translateJobSearchCriteria({ provider: "jobgether", remote: "include_hybrid", page: 1, limit: 10 });
    expect(params.get("includeHybrid")).toBe("true");
    expect(params.get("remoteType")).toBeNull();
  });
});

describe("Jobgether provider resilience", () => {
  it("requests only the asked page on the fixed host", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input).startsWith("https://jobgether.com/api/v1/jobs")).toBe(true);
      expect(String(input)).toContain("experience=senior-5-10-years");
      expect(String(input)).toContain("page=1");
      expect(String(input)).not.toContain("cv");
      return jsonResponse(validPayload);
    });
    const provider = createJobgetherProvider({ fetchImpl });
    const result = await provider.search(baseCriteria);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.page.hasMore).toBe(true);
    expect(result.page.hits).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps RFC 9457 invalid_parameter without retry or raw detail", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        {
          type: "/astroapi/ai/jobs/docs#invalid_parameter",
          title: "Invalid parameter",
          status: 400,
          detail: "Invalid value for 'experience': \"senior\"",
          code: "invalid_parameter",
          field: "experience",
        },
        400,
      ),
    );
    const provider = createJobgetherProvider({ fetchImpl });
    const result = await provider.search(baseCriteria);
    expect(result).toEqual({ ok: false, error: "provider_rejected" });
    expect(JSON.stringify(result)).not.toContain("Invalid value");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not retry 429", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ code: "rate_limited" }, 429));
    const provider = createJobgetherProvider({ fetchImpl });
    const result = await provider.search(baseCriteria);
    expect(result).toEqual({ ok: false, error: "provider_rate_limited" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries a 5xx response at most once", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ code: "internal_error" }, 500))
      .mockResolvedValueOnce(jsonResponse(validPayload, 200));
    const provider = createJobgetherProvider({ fetchImpl });
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
    const provider = createJobgetherProvider({ fetchImpl, timeoutMs: 15 });
    const result = await provider.search(baseCriteria);
    expect(result).toEqual({ ok: false, error: "provider_timeout" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry an invalid success payload", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ jobs: "nope" }, 200));
    const provider = createJobgetherProvider({ fetchImpl });
    const result = await provider.search(baseCriteria);
    expect(result).toEqual({ ok: false, error: "invalid_provider_response" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("job search service", () => {
  it("rejects limit above 25 and page above 10 before calling the provider", async () => {
    const search = vi.fn();
    const provider: JobSourceProvider = { id: "jobgether", search };
    const cache = createJobSearchCache();
    const tooMany = await executeJobSearch({ keyword: "react", page: 1, limit: 26 }, { provider, cache });
    const tooFar = await executeJobSearch({ keyword: "react", page: 11, limit: 10 }, { provider, cache });
    const withProfile = await executeJobSearch(
      { keyword: "react", page: 1, limit: 10, profile: { cv: "secret resume" } },
      { provider, cache },
    );
    expect(tooMany).toEqual({ ok: false, error: "invalid_criteria" });
    expect(tooFar).toEqual({ ok: false, error: "invalid_criteria" });
    expect(withProfile).toEqual({ ok: false, error: "invalid_criteria" });
    expect(search).not.toHaveBeenCalled();
  });

  it("does not request the next page when hasMore is true", async () => {
    const search = vi.fn(async (criteria: JobSearchCriteria) => ({
      ok: true as const,
      page: {
        provider: "jobgether" as const,
        page: criteria.page,
        limit: criteria.limit,
        hasMore: true,
        hits: [],
      },
    }));
    const provider: JobSourceProvider = { id: "jobgether", search };
    const result = await executeJobSearch(baseCriteria, { provider, cache: createJobSearchCache() });
    expect(result.ok).toBe(true);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0].page).toBe(1);
  });

  it("reuses the cache for the same normalized search and misses on another page", async () => {
    const search = vi.fn(async (criteria: JobSearchCriteria) => ({
      ok: true as const,
      page: {
        provider: "jobgether" as const,
        page: criteria.page,
        limit: criteria.limit,
        hasMore: false,
        hits: [],
      },
    }));
    const provider: JobSourceProvider = { id: "jobgether", search };
    const cache = createJobSearchCache();
    const logs: string[] = [];
    const log = (event: { criteriaHash: string }) => {
      logs.push(JSON.stringify(event));
    };
    await executeJobSearch({ ...baseCriteria, keyword: "UNIQUE_KEYWORD_DO_NOT_LOG" }, { provider, cache, log });
    await executeJobSearch({ ...baseCriteria, keyword: "unique_keyword_do_not_log" }, { provider, cache, log });
    await executeJobSearch({ ...baseCriteria, keyword: "unique_keyword_do_not_log", page: 2 }, { provider, cache, log });
    expect(search).toHaveBeenCalledTimes(2);
    expect(jobSearchCacheKey({ ...baseCriteria, page: 1 })).not.toBe(jobSearchCacheKey({ ...baseCriteria, page: 2 }));
    expect(logs.join("\n")).not.toContain("UNIQUE_KEYWORD_DO_NOT_LOG");
    expect(logs[0]).toContain("\"cache\":\"miss\"");
    expect(logs[1]).toContain("\"cache\":\"hit\"");
  });

  it("does not cache provider errors", async () => {
    const search = vi.fn(async () => ({ ok: false as const, error: "provider_unavailable" as const }));
    const provider: JobSourceProvider = { id: "jobgether", search };
    const cache = createJobSearchCache();
    await executeJobSearch(baseCriteria, { provider, cache });
    await executeJobSearch(baseCriteria, { provider, cache });
    expect(search).toHaveBeenCalledTimes(2);
  });

  it("drops expired cache entries", () => {
    let now = 1_000;
    const cache = createJobSearchCache({ ttlMs: 10, now: () => now });
    const page = { provider: "jobgether" as const, page: 1, limit: 10, hasMore: false, hits: [] };
    cache.set("jobgether:abc:page:1", page);
    expect(cache.get("jobgether:abc:page:1")).toEqual(page);
    now = 1_011;
    expect(cache.get("jobgether:abc:page:1")).toBeUndefined();
  });

  it("bounds the number of cache entries", () => {
    const cache = createJobSearchCache({ maxEntries: 2 });
    const page = { provider: "jobgether" as const, page: 1, limit: 10, hasMore: false, hits: [] };
    cache.set("a", page);
    cache.set("b", page);
    cache.set("c", page);
    expect(cache.size()).toBe(2);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("c")).toEqual(page);
  });
});

describe("search criteria", () => {
  it("parses provider-independent experience", () => {
    expect(parseJobSearchCriteria({ experience: "senior", page: 1, limit: 3 })?.experience).toBe("senior");
    expect(parseJobSearchCriteria({ experience: "senior-5-10-years", page: 1, limit: 3 })).toBeNull();
  });
});
