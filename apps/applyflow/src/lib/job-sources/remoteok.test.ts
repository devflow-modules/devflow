import { gustavoProfile } from "@devflow/applyflow-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createExternalJobId, ingestDiscoveredJobHit } from "./save-hit";
import { createRemoteOkCatalogCache } from "./remoteok/catalog-cache";
import { filterRemoteOkCatalog, paginateRemoteOkHits } from "./remoteok/filter";
import { remoteOkHtmlToPlainText } from "./remoteok/html-to-text";
import { normalizeRemoteOkJob } from "./remoteok/normalize";
import { createRemoteOkProvider } from "./remoteok/provider";
import { isRemoteOkMetadata, parseRemoteOkCatalog, parseRemoteOkJob } from "./remoteok/schema";
import type { JobSearchCriteria, JobSearchHit } from "./types";
import { DEFAULT_JOB_SOURCE_ID, JOB_SOURCE_CAPABILITIES, providerDefaultLimit, providerMaxLimit } from "./types";
import { createJobgetherProvider } from "./jobgether/provider";
import { createTheirStackProvider } from "./theirstack/provider";
import { executeJobSearch } from "./search-service";
import { createJobSearchCache } from "./cache";
import { parseJobSearchCriteria } from "./criteria";

const LISTING = "https://remoteok.com/remote-jobs/remote-software-engineer-acme-1137001";

function jobPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 1137001,
    epoch: 1_725_000_000,
    date: "2024-08-30T12:00:00+00:00",
    company: "Acme",
    company_logo: "",
    position: "Senior Software Engineer",
    tags: ["dev", "react", "typescript"],
    description:
      "<h2>Responsibilities</h2><p>Build APIs with TypeScript.</p><ul><li>Ship features</li><li>Review PRs</li></ul><script>alert(1)</script><style>.x{}</style>",
    location: "Worldwide",
    salary_min: 0,
    salary_max: 0,
    apply_url: LISTING,
    url: LISTING,
    slug: "remote-software-engineer-acme-1137001",
    ...overrides,
  };
}

function feed(jobs: Record<string, unknown>[] = [jobPayload()]) {
  return [{ last_updated: 1_725_000_000, legal: "Please link back to Remote OK" }, ...jobs];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const baseCriteria: JobSearchCriteria = {
  provider: "remoteok",
  page: 1,
  limit: 10,
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Remote OK HTML normalization", () => {
  it("converts HTML to plain text, strips script/style, keeps useful breaks, decodes entities", () => {
    const text = remoteOkHtmlToPlainText(
      "<h2>Role</h2><p>Build &amp; ship <strong>APIs</strong>.</p><ul><li>Node.js</li><li>PostgreSQL</li></ul><script>evil()</script><style>body{}</style><p onclick=\"x()\">Safe</p>",
    );
    expect(text).toContain("Role");
    expect(text).toContain("Build & ship APIs");
    expect(text).toContain("Node.js");
    expect(text).toContain("PostgreSQL");
    expect(text).toContain("Safe");
    expect(text).not.toContain("<");
    expect(text).not.toContain("evil");
    expect(text).not.toContain("body{}");
    expect(text).toMatch(/Role[\s\S]*Build/);
    expect(text.split("\n").length).toBeGreaterThan(1);
  });
});

describe("Remote OK schema and normalize", () => {
  it("excludes metadata and accepts valid jobs", () => {
    const parsed = parseRemoteOkCatalog(feed());
    expect(parsed).not.toBeNull();
    expect(parsed!.jobs).toHaveLength(1);
    expect(isRemoteOkMetadata(feed()[0])).toBe(true);
    expect(parseRemoteOkJob(feed()[0])).toBeNull();
  });

  it("accepts missing optional location and tags", () => {
    const parsed = parseRemoteOkJob(jobPayload({ location: "", tags: undefined }));
    expect(parsed).not.toBeNull();
    const hit = normalizeRemoteOkJob(parsed!);
    expect(hit?.location).toBeUndefined();
    expect(hit?.technologies).toBeUndefined();
  });

  it("rejects invalid required identity", () => {
    expect(parseRemoteOkJob(jobPayload({ position: "" }))).toBeNull();
    expect(parseRemoteOkJob(jobPayload({ company: "" }))).toBeNull();
    expect(parseRemoteOkJob(jobPayload({ description: "" }))).toBeNull();
    expect(parseRemoteOkJob(jobPayload({ url: "" }))).toBeNull();
    expect(parseRemoteOkCatalog([])).toBeNull();
    expect(parseRemoteOkCatalog("nope")).toBeNull();
  });

  it("maps sourceUrl, omits directApplyUrl, sets source remoteok, and drops raw payload", () => {
    const hit = normalizeRemoteOkJob(parseRemoteOkJob(jobPayload({ secret: "nope", apply_url: LISTING }))!);
    expect(hit).toMatchObject({
      externalId: "1137001",
      source: "remoteok",
      title: "Senior Software Engineer",
      company: "Acme",
      sourceUrl: LISTING,
      remote: "remote",
    });
    expect(hit?.description).toContain("Build APIs with TypeScript");
    expect(hit?.description).not.toContain("<");
    expect(hit?.directApplyUrl).toBeUndefined();
    expect(hit?.technologies).toEqual(["dev", "react", "typescript"]);
    expect(JSON.stringify(hit)).not.toContain("secret");
    expect(JSON.stringify(hit)).not.toContain("apply_url");
    expect(JSON.stringify(hit)).not.toContain("salary_min");
  });

  it("treats zero salary as missing and never invents salaryRange", () => {
    const hit = normalizeRemoteOkJob(parseRemoteOkJob(jobPayload())!);
    expect(hit?.salaryRange).toBeUndefined();
  });
});

describe("Remote OK deterministic ids", () => {
  it("builds job_ro_ / job_jg_ / job_ts_ ids", () => {
    expect(createExternalJobId("remoteok", "1137001")).toBe("job_ro_1137001");
    expect(createExternalJobId("jobgether", "abc")).toBe("job_jg_abc");
    expect(createExternalJobId("theirstack", "424242")).toBe("job_ts_424242");
  });

  it("ingests Remote OK hits through existing save path", () => {
    const hit = normalizeRemoteOkJob(parseRemoteOkJob(jobPayload())!)!;
    const saved = ingestDiscoveredJobHit(hit, {
      profile: gustavoProfile,
      now: new Date("2026-09-30T12:00:00.000Z"),
    });
    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.job.id).toBe("job_ro_1137001");
      expect(saved.job.source).toBe("remoteok");
      expect(saved.job.url).toBe(LISTING);
      expect(saved.job.descriptionSnapshot).not.toContain("<script>");
    }
  });
});

describe("Remote OK local filtering and pagination", () => {
  const catalog: JobSearchHit[] = [
    {
      externalId: "1",
      source: "remoteok",
      title: "Senior React Engineer",
      company: "Alpha",
      description: "React and Node.js role",
      location: "United States",
      sourceUrl: `${LISTING}-1`,
      technologies: ["react", "node"],
      postedAt: "2026-09-01T00:00:00.000Z",
    },
    {
      externalId: "2",
      source: "remoteok",
      title: "Python Backend",
      company: "Beta Labs",
      description: "Django APIs",
      location: "Brazil",
      sourceUrl: `${LISTING}-2`,
      technologies: ["python"],
      postedAt: "2026-08-01T00:00:00.000Z",
    },
    {
      externalId: "3",
      source: "remoteok",
      title: "Junior Designer",
      company: "Gamma",
      description: "Figma only",
      sourceUrl: `${LISTING}-3`,
      postedAt: "2026-07-01T00:00:00.000Z",
    },
  ];

  it("matches keyword by title, company, tag, and description (case and accent insensitive)", () => {
    expect(filterRemoteOkCatalog(catalog, { ...baseCriteria, keyword: "react" }).map((h) => h.externalId)).toEqual(["1"]);
    expect(filterRemoteOkCatalog(catalog, { ...baseCriteria, keyword: "BETA" }).map((h) => h.externalId)).toEqual(["2"]);
    expect(filterRemoteOkCatalog(catalog, { ...baseCriteria, keyword: "django" }).map((h) => h.externalId)).toEqual(["2"]);
    expect(filterRemoteOkCatalog(catalog, { ...baseCriteria, keyword: "node" }).map((h) => h.externalId)).toEqual(["1"]);
    expect(filterRemoteOkCatalog(catalog, { ...baseCriteria, keyword: "são" })).toEqual([]);
    const accented: JobSearchHit[] = [
      {
        ...catalog[1]!,
        title: "Engenheiro Sênior",
        company: "São Paulo Tech",
      },
    ];
    expect(filterRemoteOkCatalog(accented, { ...baseCriteria, keyword: "senior" }).map((h) => h.externalId)).toEqual(["2"]);
    expect(filterRemoteOkCatalog(accented, { ...baseCriteria, keyword: "sao paulo" }).map((h) => h.externalId)).toEqual([
      "2",
    ]);
  });

  it("uses title evidence for senior and does not treat empty location as worldwide", () => {
    expect(filterRemoteOkCatalog(catalog, { ...baseCriteria, experience: "senior" }).map((h) => h.externalId)).toEqual([
      "1",
    ]);
    expect(filterRemoteOkCatalog(catalog, { ...baseCriteria, location: "brazil" }).map((h) => h.externalId)).toEqual([
      "2",
    ]);
    expect(filterRemoteOkCatalog(catalog, { ...baseCriteria, location: "worldwide" }).map((h) => h.externalId)).toEqual(
      [],
    );
  });

  it("paginates locally and computes hasMore", () => {
    const page1 = paginateRemoteOkHits(catalog, 1, 2);
    expect(page1.pageHits).toHaveLength(2);
    expect(page1.hasMore).toBe(true);
    const page2 = paginateRemoteOkHits(catalog, 2, 2);
    expect(page2.pageHits.map((h) => h.externalId)).toEqual(["3"]);
    expect(page2.hasMore).toBe(false);
  });

  it("enforces provider max limit via criteria parsing", () => {
    expect(parseJobSearchCriteria({ provider: "remoteok", page: 1, limit: 100 })).toBeNull();
    expect(parseJobSearchCriteria({ provider: "remoteok", page: 1, limit: 25 })?.limit).toBe(25);
    expect(providerDefaultLimit("remoteok")).toBe(10);
    expect(providerMaxLimit("remoteok")).toBe(25);
  });
});

describe("Remote OK provider cache and HTTP", () => {
  it("fetches once for first search and reuses catalog for criteria/page/keyword changes", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(feed([jobPayload(), jobPayload({ id: 2, position: "Python Dev", tags: ["python"] })])));
    const catalogCache = createRemoteOkCatalogCache({ ttlMs: 30 * 60 * 1000 });
    const provider = createRemoteOkProvider({ fetchImpl, catalogCache });

    const first = await provider.search(baseCriteria);
    expect(first.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const second = await provider.search({ ...baseCriteria, keyword: "python" });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.page.hits.every((h) => /python/i.test(JSON.stringify(h)))).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const page2 = await provider.search({ ...baseCriteria, page: 2, limit: 1 });
    expect(page2.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("refreshes after TTL expiry and does not cache errors", async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(feed()))
      .mockResolvedValueOnce(jsonResponse({ bad: true }, 500))
      .mockResolvedValueOnce(jsonResponse({ bad: true }, 500))
      .mockResolvedValueOnce(jsonResponse(feed([jobPayload({ id: 99 })])));

    const catalogCache = createRemoteOkCatalogCache({ ttlMs: 30 * 60 * 1000, now: () => Date.now() });
    const provider = createRemoteOkProvider({ fetchImpl, catalogCache, now: () => Date.now() });

    expect((await provider.search(baseCriteria)).ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    vi.setSystemTime(now + 31 * 60 * 1000);
    const failed = await provider.search(baseCriteria);
    expect(failed.ok).toBe(false);
    // one attempt + one retry on 5xx
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(catalogCache.get()).toBeUndefined();

    const recovered = await provider.search(baseCriteria);
    expect(recovered.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("coalesces concurrent initial searches into one upstream request", async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const provider = createRemoteOkProvider({
      fetchImpl,
      catalogCache: createRemoteOkCatalogCache({ ttlMs: 30 * 60 * 1000 }),
    });

    const p1 = provider.search(baseCriteria);
    const p2 = provider.search({ ...baseCriteria, keyword: "react" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    resolveFetch?.(jsonResponse(feed()));
    const [a, b] = await Promise.all([p1, p2]);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps timeout, 429 without retry, and 5xx with one retry", async () => {
    const timeoutFetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const err = new Error("aborted");
      err.name = "AbortError";
      // simulate abort by ignoring signal and throwing AbortError
      void init;
      throw err;
    });
    const timeoutProvider = createRemoteOkProvider({
      fetchImpl: timeoutFetch,
      catalogCache: createRemoteOkCatalogCache(),
    });
    const timedOut = await timeoutProvider.search(baseCriteria);
    expect(timedOut).toEqual({ ok: false, error: "provider_timeout" });
    expect(timeoutFetch).toHaveBeenCalledTimes(2);

    const rateFetch = vi.fn(async () => jsonResponse({ error: "rate" }, 429));
    const rateProvider = createRemoteOkProvider({
      fetchImpl: rateFetch,
      catalogCache: createRemoteOkCatalogCache(),
    });
    expect(await rateProvider.search(baseCriteria)).toEqual({ ok: false, error: "provider_rate_limited" });
    expect(rateFetch).toHaveBeenCalledTimes(1);

    const serverFetch = vi.fn(async () => jsonResponse({ error: "boom" }, 503));
    const serverProvider = createRemoteOkProvider({
      fetchImpl: serverFetch,
      catalogCache: createRemoteOkCatalogCache(),
    });
    expect(await serverProvider.search(baseCriteria)).toEqual({ ok: false, error: "provider_unavailable" });
    expect(serverFetch).toHaveBeenCalledTimes(2);
  });

  it("keeps catalog cache bounded", () => {
    const cache = createRemoteOkCatalogCache();
    const hits = Array.from({ length: 600 }, (_, i) => ({
      externalId: String(i),
      source: "remoteok" as const,
      title: `Job ${i}`,
      sourceUrl: `${LISTING}-${i}`,
    }));
    cache.set(hits);
    expect(cache.size()).toBe(500);
  });
});

describe("Remote OK multi-source contract", () => {
  it("keeps Jobgether default and Remote OK capabilities", () => {
    expect(DEFAULT_JOB_SOURCE_ID).toBe("jobgether");
    expect(JOB_SOURCE_CAPABILITIES.remoteok).toEqual({ fullDescription: true, attributionRequired: true });
    expect(JOB_SOURCE_CAPABILITIES.jobgether.fullDescription).toBe(false);
    expect(JOB_SOURCE_CAPABILITIES.theirstack.fullDescription).toBe(true);
  });

  it("invokes only the selected provider and never dual-queries", async () => {
    const jobgetherFetch = vi.fn(async () =>
      jsonResponse({
        jobs: [],
        pagination: { page: 1, limit: 10, hasMore: false },
      }),
    );
    const remoteFetch = vi.fn(async () => jsonResponse(feed()));
    const theirFetch = vi.fn(async () => jsonResponse({ data: [] }));

    const providers = {
      jobgether: createJobgetherProvider({ fetchImpl: jobgetherFetch }),
      theirstack: createTheirStackProvider({ fetchImpl: theirFetch, apiKey: "test-key" }),
      remoteok: createRemoteOkProvider({ fetchImpl: remoteFetch, catalogCache: createRemoteOkCatalogCache() }),
    };
    const cache = createJobSearchCache();

    const remote = await executeJobSearch({ provider: "remoteok", page: 1 }, { providers, cache });
    expect(remote.ok).toBe(true);
    expect(remoteFetch).toHaveBeenCalledTimes(1);
    expect(jobgetherFetch).not.toHaveBeenCalled();
    expect(theirFetch).not.toHaveBeenCalled();

    const jg = await executeJobSearch({ provider: "jobgether", page: 1 }, { providers, cache });
    expect(jg.ok).toBe(true);
    expect(jobgetherFetch).toHaveBeenCalledTimes(1);
    expect(remoteFetch).toHaveBeenCalledTimes(1);
  });
});
