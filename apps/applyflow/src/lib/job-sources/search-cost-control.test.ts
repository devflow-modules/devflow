import { describe, expect, it, beforeEach, vi } from "vitest";

import { createJobSearchCache } from "./cache";
import { executeJobSearch, jobSearchHttpStatus } from "./search-service";
import { authorizeJobSearchProvider } from "./search-access";
import { isTheirStackSearchEnabled, isSharedApplyFlowDeployment } from "./theirstack-access";
import {
  consumeTheirStackAccountQuota,
  resetTheirStackAccountQuotaForTests,
  THEIRSTACK_ACCOUNT_QUOTA_LIMIT,
} from "./theirstack-quota";
import type { JobSearchPage, JobSourceProvider } from "./types";

function page(overrides: Partial<JobSearchPage> = {}): JobSearchPage {
  return {
    provider: "theirstack",
    page: 1,
    limit: 5,
    hasMore: false,
    hits: [],
    ...overrides,
  };
}

function mockTheirStack(search: JobSourceProvider["search"]): JobSourceProvider {
  return { id: "theirstack", search };
}

function mockJobgether(search: JobSourceProvider["search"]): JobSourceProvider {
  return { id: "jobgether", search };
}

describe("TheirStack access gate", () => {
  it("disables TheirStack on shared Vercel deployments by default", () => {
    expect(
      isTheirStackSearchEnabled({
        VERCEL_ENV: "production",
        THEIRSTACK_API_KEY: "sk_test",
      }),
    ).toBe(false);
    expect(
      isTheirStackSearchEnabled({
        VERCEL_ENV: "preview",
        THEIRSTACK_API_KEY: "sk_test",
      }),
    ).toBe(false);
    expect(isSharedApplyFlowDeployment({ VERCEL_ENV: "production" })).toBe(true);
  });

  it("allows explicit opt-in only when key is present", () => {
    expect(
      isTheirStackSearchEnabled({
        VERCEL_ENV: "production",
        APPLYFLOW_THEIRSTACK_ENABLED: "true",
        THEIRSTACK_API_KEY: "sk_test",
      }),
    ).toBe(true);
    expect(
      isTheirStackSearchEnabled({
        VERCEL_ENV: "production",
        APPLYFLOW_THEIRSTACK_ENABLED: "true",
      }),
    ).toBe(false);
  });
});

describe("authorizeJobSearchProvider", () => {
  it("rejects anonymous TheirStack", () => {
    expect(
      authorizeJobSearchProvider("theirstack", { kind: "anonymous_local", reason: "auth_not_configured" }),
    ).toEqual({ ok: false, error: "auth_required" });
  });

  it("rejects TheirStack when cost gate is off", () => {
    expect(
      authorizeJobSearchProvider(
        "theirstack",
        { kind: "authenticated", authProviderSub: "user-a" },
        { THEIRSTACK_API_KEY: "sk", VERCEL_ENV: "production" },
      ),
    ).toEqual({ ok: false, error: "provider_not_available" });
  });

  it("allows Jobgether for anonymous local when auth is not configured", () => {
    expect(
      authorizeJobSearchProvider("jobgether", { kind: "anonymous_local", reason: "auth_not_configured" }),
    ).toEqual({
      ok: true,
      caller: { kind: "anonymous_local", reason: "auth_not_configured" },
    });
  });
});

describe("TheirStack account quota", () => {
  beforeEach(() => {
    resetTheirStackAccountQuotaForTests();
  });

  it("allows below limit and rejects above", () => {
    for (let i = 0; i < THEIRSTACK_ACCOUNT_QUOTA_LIMIT; i += 1) {
      expect(consumeTheirStackAccountQuota("acct-1").ok).toBe(true);
    }
    expect(consumeTheirStackAccountQuota("acct-1")).toEqual({ ok: false, error: "app_rate_limited" });
  });

  it("isolates accounts", () => {
    for (let i = 0; i < THEIRSTACK_ACCOUNT_QUOTA_LIMIT; i += 1) {
      expect(consumeTheirStackAccountQuota("acct-a").ok).toBe(true);
    }
    expect(consumeTheirStackAccountQuota("acct-b").ok).toBe(true);
  });
});

describe("executeJobSearch cost control", () => {
  beforeEach(() => {
    resetTheirStackAccountQuotaForTests();
  });

  it("rejects TheirStack without auth and does not call provider", async () => {
    const search = vi.fn(async () => ({ ok: true as const, page: page() }));
    const result = await executeJobSearch(
      { provider: "theirstack", page: 1, limit: 5 },
      {
        providers: { theirstack: mockTheirStack(search) },
        cache: createJobSearchCache(),
        access: { theirStackEnabled: true, authProviderSub: null, allowAnonymousFreeProviders: false },
      },
    );
    expect(result).toEqual({ ok: false, error: "auth_required" });
    expect(search).not.toHaveBeenCalled();
    expect(jobSearchHttpStatus("auth_required")).toBe(401);
  });

  it("rejects spoofed account fields via strict criteria parsing", async () => {
    const search = vi.fn(async () => ({ ok: true as const, page: page() }));
    const result = await executeJobSearch(
      { provider: "theirstack", page: 1, limit: 5, accountId: "attacker" },
      {
        providers: { theirstack: mockTheirStack(search) },
        cache: createJobSearchCache(),
        access: {
          theirStackEnabled: true,
          authProviderSub: "real-user",
          allowAnonymousFreeProviders: false,
        },
      },
    );
    expect(result).toEqual({ ok: false, error: "invalid_criteria" });
    expect(search).not.toHaveBeenCalled();
  });

  it("does not call TheirStack when app quota is exceeded", async () => {
    const search = vi.fn(async () => ({ ok: true as const, page: page() }));
    const consume = vi.fn(() => ({ ok: false as const, error: "app_rate_limited" as const }));
    const result = await executeJobSearch(
      { provider: "theirstack", keyword: "react", page: 1, limit: 5 },
      {
        providers: { theirstack: mockTheirStack(search) },
        cache: createJobSearchCache(),
        access: {
          theirStackEnabled: true,
          authProviderSub: "user-1",
          consumeTheirStackQuota: consume,
        },
      },
    );
    expect(result).toEqual({ ok: false, error: "app_rate_limited" });
    expect(consume).toHaveBeenCalledTimes(1);
    expect(search).not.toHaveBeenCalled();
    expect(jobSearchHttpStatus("app_rate_limited")).toBe(429);
  });

  it("criteria changes cannot evade account quota", async () => {
    let calls = 0;
    const consume = vi.fn(() => {
      calls += 1;
      if (calls > THEIRSTACK_ACCOUNT_QUOTA_LIMIT) return { ok: false as const, error: "app_rate_limited" as const };
      return { ok: true as const, remaining: THEIRSTACK_ACCOUNT_QUOTA_LIMIT - calls };
    });
    const search = vi.fn(async () => ({ ok: true as const, page: page() }));
    const cache = createJobSearchCache();
    for (let i = 0; i < THEIRSTACK_ACCOUNT_QUOTA_LIMIT; i += 1) {
      const result = await executeJobSearch(
        { provider: "theirstack", keyword: `kw-${i}`, page: 1, limit: 5 },
        {
          providers: { theirstack: mockTheirStack(search) },
          cache,
          access: { theirStackEnabled: true, authProviderSub: "user-1", consumeTheirStackQuota: consume },
        },
      );
      expect(result.ok).toBe(true);
    }
    const denied = await executeJobSearch(
      { provider: "theirstack", keyword: "fresh-evasion", page: 1, limit: 5 },
      {
        providers: { theirstack: mockTheirStack(search) },
        cache,
        access: { theirStackEnabled: true, authProviderSub: "user-1", consumeTheirStackQuota: consume },
      },
    );
    expect(denied).toEqual({ ok: false, error: "app_rate_limited" });
    expect(search).toHaveBeenCalledTimes(THEIRSTACK_ACCOUNT_QUOTA_LIMIT);
  });

  it("warm-cache hits do not consume quota or call provider", async () => {
    const search = vi.fn(async () => ({ ok: true as const, page: page({ hits: [] }) }));
    const consume = vi.fn(() => ({ ok: true as const, remaining: 9 }));
    const cache = createJobSearchCache();
    const deps = {
      providers: { theirstack: mockTheirStack(search) },
      cache,
      access: {
        theirStackEnabled: true,
        authProviderSub: "user-1",
        consumeTheirStackQuota: consume,
      },
    };
    const first = await executeJobSearch({ provider: "theirstack", keyword: "same", page: 1, limit: 5 }, deps);
    const second = await executeJobSearch({ provider: "theirstack", keyword: "same", page: 1, limit: 5 }, deps);
    expect(first.ok && first.cached).toBe(false);
    expect(second.ok && second.cached).toBe(true);
    expect(search).toHaveBeenCalledTimes(1);
    expect(consume).toHaveBeenCalledTimes(1);
  });

  it("TheirStack disabled gate does not affect Jobgether", async () => {
    const ts = vi.fn(async () => ({ ok: true as const, page: page() }));
    const jg = vi.fn(async () => ({
      ok: true as const,
      page: page({ provider: "jobgether" }),
    }));
    const denied = await executeJobSearch(
      { provider: "theirstack", page: 1, limit: 5 },
      {
        providers: { theirstack: mockTheirStack(ts), jobgether: mockJobgether(jg) },
        cache: createJobSearchCache(),
        access: { theirStackEnabled: false, authProviderSub: "user-1" },
      },
    );
    const allowed = await executeJobSearch(
      { provider: "jobgether", keyword: "react", page: 1, limit: 10 },
      {
        providers: { theirstack: mockTheirStack(ts), jobgether: mockJobgether(jg) },
        cache: createJobSearchCache(),
        access: { theirStackEnabled: false, authProviderSub: "user-1" },
      },
    );
    expect(denied).toEqual({ ok: false, error: "provider_not_available" });
    expect(allowed.ok).toBe(true);
    expect(ts).not.toHaveBeenCalled();
    expect(jg).toHaveBeenCalledTimes(1);
  });

  it("pagination page changes still consume quota on cache miss", async () => {
    const consume = vi.fn(() => ({ ok: true as const, remaining: 5 }));
    const search = vi.fn(async () => ({ ok: true as const, page: page({ page: 2, hasMore: false }) }));
    await executeJobSearch(
      { provider: "theirstack", keyword: "react", page: 2, limit: 5 },
      {
        providers: { theirstack: mockTheirStack(search) },
        cache: createJobSearchCache(),
        access: { theirStackEnabled: true, authProviderSub: "user-1", consumeTheirStackQuota: consume },
      },
    );
    expect(consume).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("TheirStack quota failure does not affect Remote OK", async () => {
    const ts = vi.fn(async () => ({ ok: true as const, page: page() }));
    const ro = vi.fn(async () => ({
      ok: true as const,
      page: page({ provider: "remoteok" }),
    }));
    const consume = vi.fn(() => ({ ok: false as const, error: "app_rate_limited" as const }));
    const denied = await executeJobSearch(
      { provider: "theirstack", page: 1, limit: 5 },
      {
        providers: {
          theirstack: mockTheirStack(ts),
          remoteok: { id: "remoteok", search: ro },
        },
        cache: createJobSearchCache(),
        access: {
          theirStackEnabled: true,
          authProviderSub: "user-1",
          consumeTheirStackQuota: consume,
        },
      },
    );
    const allowed = await executeJobSearch(
      { provider: "remoteok", keyword: "go", page: 1, limit: 10 },
      {
        providers: {
          theirstack: mockTheirStack(ts),
          remoteok: { id: "remoteok", search: ro },
        },
        cache: createJobSearchCache(),
        access: {
          theirStackEnabled: true,
          authProviderSub: "user-1",
          consumeTheirStackQuota: consume,
        },
      },
    );
    expect(denied).toEqual({ ok: false, error: "app_rate_limited" });
    expect(allowed.ok).toBe(true);
    expect(ts).not.toHaveBeenCalled();
    expect(ro).toHaveBeenCalledTimes(1);
  });

  it("search criteria never accept CV/profile/resume fields", async () => {
    const search = vi.fn(async () => ({ ok: true as const, page: page() }));
    for (const payload of [
      { provider: "theirstack", page: 1, limit: 5, resume: "secret" },
      { provider: "theirstack", page: 1, limit: 5, cv: "secret" },
      { provider: "theirstack", page: 1, limit: 5, profile: { name: "x" } },
    ]) {
      const result = await executeJobSearch(payload, {
        providers: { theirstack: mockTheirStack(search) },
        cache: createJobSearchCache(),
        access: { theirStackEnabled: true, authProviderSub: "user-1" },
      });
      expect(result).toEqual({ ok: false, error: "invalid_criteria" });
    }
    expect(search).not.toHaveBeenCalled();
  });

  it("maps provider vs app rate-limit contracts", () => {
    expect(jobSearchHttpStatus("provider_rate_limited")).toBe(429);
    expect(jobSearchHttpStatus("app_rate_limited")).toBe(429);
    expect(jobSearchHttpStatus("provider_not_available")).toBe(403);
    expect(jobSearchHttpStatus("auth_required")).toBe(401);
  });
});