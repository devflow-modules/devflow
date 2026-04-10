const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 90;

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

export function allowAiLogsRequest(key: string): boolean {
  const now = Date.now();
  const b = prune(key, now);
  if (b.count >= MAX_PER_WINDOW) return false;
  b.count += 1;
  return true;
}

export function aiLogsRateLimitKey(tenantId: string, userId: string): string {
  return `ailogs:${tenantId}:${userId}`;
}

export function resetAiLogsRateLimitBucketsForTest(): void {
  buckets.clear();
}
