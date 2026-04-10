const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function prune(key: string, now: number): Bucket {
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    const fresh = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, fresh);
    return fresh;
  }
  return b;
}

export function allowAiFunnelMetricsRequest(key: string): boolean {
  const now = Date.now();
  const b = prune(key, now);
  if (b.count >= MAX_PER_WINDOW) return false;
  b.count += 1;
  return true;
}

export function aiFunnelMetricsRateLimitKey(tenantId: string, userId: string): string {
  return `funnel:${tenantId}:${userId}`;
}

export function resetAiFunnelMetricsRateLimitBucketsForTest(): void {
  buckets.clear();
}
