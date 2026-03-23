/**
 * Logs de autenticação para observabilidade.
 * NUNCA logar: senha, token JWT, cookie value, ou dados sensíveis completos.
 */

type AuthLogEvent =
  | { type: "login_success"; userId: string; tenantId: string; role: string }
  | { type: "login_failed"; reason?: string }
  | { type: "logout"; userId: string; tenantId: string }
  | { type: "token_expired"; path?: string }
  | { type: "unauthorized"; path?: string }
  | { type: "forbidden"; userId: string; tenantId: string; path?: string; requiredRole?: string }
  | { type: "tenant_mismatch"; userId: string; resourceTenantId: string; userTenantId: string }
  | { type: "password_reset_requested"; userId: string; tenantId: string }
  | { type: "password_reset_success"; userId: string };

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const omit = ["password", "token", "cookie", "secret", "authorization"];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const lower = k.toLowerCase();
    if (omit.some((o) => lower.includes(o))) continue;
    out[k] = v;
  }
  return out;
}

export function logAuth(event: AuthLogEvent): void {
  const payload = sanitize(event as unknown as Record<string, unknown>);
  const line = JSON.stringify({ ts: new Date().toISOString(), ...payload });
  if (event.type === "login_failed" || event.type === "unauthorized" || event.type === "forbidden") {
    console.warn("[auth]", line);
  } else {
    console.info("[auth]", line);
  }
}
