const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX = 5;

/** Prefixos sensíveis: limites por IP (memória — em multi-instância usar store partilhado). */
const LIMITS: Record<string, { windowMs: number; max: number }> = {
  auth: { windowMs: DEFAULT_WINDOW_MS, max: DEFAULT_MAX },
  "forgot-password": { windowMs: DEFAULT_WINDOW_MS, max: 5 },
  "reset-password": { windowMs: DEFAULT_WINDOW_MS, max: 5 },
  /** Login: limite mais alto que forgot/reset para não bloquear equipas no mesmo IP. */
  "auth-login": { windowMs: DEFAULT_WINDOW_MS, max: 30 },
  /** Cadastro: janela igual, limite moderado por IP. */
  signup: { windowMs: DEFAULT_WINDOW_MS, max: 10 },
};

const store = new Map<string, { count: number; resetAt: number }>();

function configFor(prefix: string) {
  return LIMITS[prefix] ?? LIMITS.auth;
}

function getKey(ip: string, prefix: string): string {
  return `${prefix}:${ip}`;
}

export function checkRateLimit(ip: string, prefix = "auth"): { ok: boolean; retryAfter?: number } {
  const { windowMs, max } = configFor(prefix);
  const key = getKey(ip, prefix);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= max) {
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
