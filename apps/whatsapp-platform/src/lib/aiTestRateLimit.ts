/**
 * Rate limit em memória para POST /api/ai/test (defesa em profundidade).
 * Em múltiplas instâncias, usar Redis/Upstash num follow-up.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

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

export function allowAiTestRequest(key: string): boolean {
  const now = Date.now();
  const b = prune(key, now);
  if (b.count >= MAX_PER_WINDOW) {
    return false;
  }
  b.count += 1;
  return true;
}

export function aiTestRateLimitKey(tenantId: string, userId: string): string {
  return `${tenantId}:${userId}`;
}

/** Apenas para testes (Vitest) — repõe contadores em memória. */
export function resetAiTestRateLimitBucketsForTest(): void {
  buckets.clear();
}
