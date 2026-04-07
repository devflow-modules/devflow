const OMIT_KEY_SUBSTR = ["password", "token", "cookie", "secret", "authorization", "hash"];

export function sanitizeLogData(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const lower = k.toLowerCase();
    if (OMIT_KEY_SUBSTR.some((o) => lower.includes(o))) continue;
    out[k] = v;
  }
  return out;
}
