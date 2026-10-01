/**
 * Process-local fixed-window quota for authenticated TheirStack upstream calls.
 *
 * NOT distributed. Safe only as defense-in-depth on a single Node process
 * (personal/local or explicit single-tenant opt-in). Under Vercel multi-instance
 * this does NOT close cost abuse by itself — TheirStack must stay disabled on
 * shared deploys until a shared limiter exists (see theirstack-access.ts).
 *
 * Counts only cost-bearing upstream searches (caller must skip warm-cache hits).
 */

export const THEIRSTACK_ACCOUNT_QUOTA_LIMIT = 10;
export const THEIRSTACK_ACCOUNT_QUOTA_WINDOW_MS = 60 * 60 * 1000;

type QuotaBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, QuotaBucket>();

export type TheirStackQuotaResult = { ok: true; remaining: number } | { ok: false; error: "app_rate_limited" };

export type TheirStackQuotaDeps = {
  now?: () => number;
  limit?: number;
  windowMs?: number;
};

export function consumeTheirStackAccountQuota(
  authProviderSub: string,
  deps: TheirStackQuotaDeps = {},
): TheirStackQuotaResult {
  const key = authProviderSub.trim();
  if (!key) return { ok: false, error: "app_rate_limited" };

  const now = deps.now?.() ?? Date.now();
  const limit = deps.limit ?? THEIRSTACK_ACCOUNT_QUOTA_LIMIT;
  const windowMs = deps.windowMs ?? THEIRSTACK_ACCOUNT_QUOTA_WINDOW_MS;
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: Math.max(0, limit - 1) };
  }

  if (existing.count >= limit) {
    return { ok: false, error: "app_rate_limited" };
  }

  existing.count += 1;
  return { ok: true, remaining: Math.max(0, limit - existing.count) };
}

/** Test-only reset. */
export function resetTheirStackAccountQuotaForTests(): void {
  buckets.clear();
}
