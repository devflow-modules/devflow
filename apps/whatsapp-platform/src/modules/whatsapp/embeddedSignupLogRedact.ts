/** Máscara / redacção para logs Embedded Signup — nunca registar credenciais completas. */

export function maskAccessTokenForLog(token: string): string {
  const t = token.trim();
  if (t.length <= 12) return "***";
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

/** Fingerprint não reversível (SHA-256 hex truncado) — só para correlação em logs. */
export async function fingerprintSecretForLog(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${hex.slice(0, 16)}`;
}

const SENSITIVE_JSON_KEYS = new Set([
  "access_token",
  "refresh_token",
  "token",
  "code",
  "client_secret",
  "app_secret",
  "authorization",
]);

/**
 * Resume seguro de corpo Graph/OAuth para logs: nunca inclui valores de tokens/códigos.
 * Em JSON: só chaves + flags (has_access_token) + error.message se presente.
 * Em texto não-JSON: length + prefixo sanitizado sem "EAA" tokens.
 */
export function safeOAuthBodySummary(raw: string, maxErrorLen = 200): Record<string, unknown> {
  const trimmed = raw.trim();
  const summary: Record<string, unknown> = {
    bodyLength: trimmed.length,
    contentTypeHint: trimmed.startsWith("{") ? "json" : "text",
  };
  if (!trimmed) return summary;

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      summary.keys = Object.keys(parsed);
      for (const k of Object.keys(parsed)) {
        if (SENSITIVE_JSON_KEYS.has(k.toLowerCase())) {
          summary[`has_${k}`] = true;
        }
      }
      const err = parsed.error;
      if (err && typeof err === "object" && !Array.isArray(err)) {
        const e = err as { message?: string; type?: string; code?: number; error_subcode?: number };
        summary.graphError = {
          message: typeof e.message === "string" ? e.message.slice(0, maxErrorLen) : undefined,
          type: e.type,
          code: e.code,
          error_subcode: e.error_subcode,
        };
      }
      return summary;
    }
  } catch {
    /* non-JSON */
  }

  // Evitar prefixos de token Meta (EAA…) em texto livre
  const redacted = trimmed.replace(/EAA[A-Za-z0-9]+/g, "[REDACTED_TOKEN]");
  summary.preview = redacted.slice(0, 120);
  return summary;
}

/** Erro de troca OAuth sem corpo cru (pode conter access_token). */
export function oauthExchangeFailureMessage(httpStatus: number, raw: string): string {
  const summary = safeOAuthBodySummary(raw);
  const graphMsg =
    summary.graphError &&
    typeof summary.graphError === "object" &&
    summary.graphError !== null &&
    "message" in summary.graphError
      ? String((summary.graphError as { message?: string }).message ?? "")
      : "";
  if (graphMsg) return `Falha ao trocar code por token (HTTP ${httpStatus}): ${graphMsg}`;
  return `Falha ao trocar code por token (HTTP ${httpStatus}; bodyLength=${summary.bodyLength})`;
}
