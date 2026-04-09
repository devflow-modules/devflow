const SENSITIVE_KEY = new RegExp(
  "(^|_)(access_?token|api_?key|authorization|password|secret|cookie|refresh_?token|bearer|id_?token)($|_)",
  "i"
);

const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /\bsk_(live|test)_[a-zA-Z0-9]{20,}/i,
  /\bEAA[a-zA-Z0-9_-]{20,}/,
  /\bBearer\s+[a-zA-Z0-9._-]{10,}/i,
];

function scrubString(s: string): string {
  let out = s;
  for (const re of SENSITIVE_VALUE_PATTERNS) {
    out = out.replace(re, "[redacted]");
  }
  return out;
}

/**
 * Remove chaves sensíveis e ofusca padrões conhecidos em strings (defesa em profundidade).
 */
export function sanitizeSupportPayload<T>(value: T): T {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return scrubString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSupportPayload(item)) as T;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SENSITIVE_KEY.test(k)) {
        continue;
      }
      next[k] = sanitizeSupportPayload(v);
    }
    return next as T;
  }

  return value;
}
