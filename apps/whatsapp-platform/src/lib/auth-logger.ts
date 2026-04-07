/**
 * Logs de autenticação para observabilidade.
 * NUNCA logar: senha, token JWT, cookie value, ou dados sensíveis completos.
 */

import { logEvent } from "@/lib/observability/log-event";
import { trackLoginFailureForAlert } from "@/lib/observability/alerts";

type AuthLogEvent =
  | { type: "login_success"; userId: string; tenantId: string; role: string; sessionId?: string }
  | { type: "login_failed"; reason?: string; ip?: string; detail?: string }
  | { type: "logout"; userId: string; tenantId: string; sessionId?: string }
  | { type: "session_revoked"; userId: string; sessionId: string; reason?: string }
  | { type: "session_rejected"; reason: string; userId?: string }
  | { type: "sessions_revoked_all"; userId: string; reason?: string }
  | { type: "token_expired"; path?: string }
  | { type: "unauthorized"; path?: string; method?: string }
  | {
      type: "forbidden";
      userId: string;
      tenantId: string;
      path?: string;
      method?: string;
      requiredRole?: string;
    }
  | { type: "tenant_mismatch"; userId: string; resourceTenantId: string; userTenantId: string }
  | { type: "password_reset_requested"; userId: string; tenantId: string }
  | { type: "password_reset_success"; userId: string }
  | { type: "rate_limited"; route: string; ip?: string };

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
  const level =
    event.type === "login_failed" ||
    event.type === "unauthorized" ||
    event.type === "forbidden" ||
    event.type === "session_rejected" ||
    event.type === "rate_limited"
      ? "warn"
      : "info";
  logEvent(level, "auth", event.type, payload as Record<string, unknown>);
  if (event.type === "login_failed" && event.ip) {
    trackLoginFailureForAlert(event.ip);
  }
}
