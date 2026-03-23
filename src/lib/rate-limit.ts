/**
 * Rate limit simples em memória por IP.
 * 5 requisições / 15min por chave (ex: IP).
 * Para produção com múltiplas instâncias, usar Redis.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15min
const MAX_REQUESTS = 5;

const store = new Map<string, { count: number; resetAt: number }>();

function getKey(ip: string, prefix: string): string {
  return `${prefix}:${ip}`;
}

export function checkRateLimit(ip: string, prefix = "auth"): { ok: boolean; retryAfter?: number } {
  const key = getKey(ip, prefix);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { ok: true };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
