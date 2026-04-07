const SENSITIVE_QUERY_KEYS = ["token", "code", "access_token", "refresh_token", "password", "secret"];

function hasSensitiveQuery(searchParams: URLSearchParams): boolean {
  for (const k of searchParams.keys()) {
    const lower = k.toLowerCase();
    if (SENSITIVE_QUERY_KEYS.some((s) => lower.includes(s))) return true;
  }
  return false;
}

/**
 * Reduz URL a origem + path; remove query com segredos.
 */
export function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.search && hasSensitiveQuery(u.searchParams)) {
      return `${u.origin}${u.pathname}?[REDACTED_QUERY]`;
    }
    if (u.search) {
      return `${u.origin}${u.pathname}${u.search}`;
    }
    return `${u.origin}${u.pathname}`;
  } catch {
    return "[REDACTED_URL]";
  }
}

function maskTokenLike(value: string, visiblePrefix = 4): string {
  if (value.length <= visiblePrefix) return "[REDACTED]";
  return `${value.slice(0, visiblePrefix)}… (len=${value.length})`;
}

/**
 * Metadados persistidos / logs: nunca tokens ou senhas completas.
 */
export function sanitizeEmailPayloadForMetadata(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };
  if (typeof out.resetUrl === "string") out.resetUrl = redactUrl(out.resetUrl);
  if (typeof out.setPasswordUrl === "string") out.setPasswordUrl = redactUrl(out.setPasswordUrl);
  if (typeof out.loginUrl === "string") out.loginUrl = redactUrl(out.loginUrl);
  if (typeof out.temporaryPassword === "string") out.temporaryPassword = "[REDACTED_PASSWORD]";
  return out;
}

export type TransactionalEmailLogShape = {
  type: string;
  tenantId?: string | null;
  userId?: string | null;
  toEmail: string;
  status: string;
  durationMs: number;
  provider: string;
  providerMessageId?: string;
  errorCode?: string;
};

/**
 * Campos enviados ao logger estruturado (sem segredos em URLs).
 */
export function sanitizeTransactionalEmailLog(
  input: TransactionalEmailLogShape & { metadataHint?: Record<string, unknown> }
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    type: input.type,
    tenantId: input.tenantId ?? undefined,
    userId: input.userId ?? undefined,
    toEmail: input.toEmail,
    status: input.status,
    duration_ms: input.durationMs,
    provider: input.provider,
    providerMessageId: input.providerMessageId,
    errorCode: input.errorCode,
  };
  if (input.metadataHint) {
    base.metadata = sanitizeEmailPayloadForMetadata(input.metadataHint as Record<string, unknown>);
  }
  return base;
}

export { maskTokenLike };
