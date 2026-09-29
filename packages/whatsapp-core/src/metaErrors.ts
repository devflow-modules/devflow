/**
 * Classificação de falhas Meta Graph / rede para retry outbound.
 *
 * Timeout ou falha de rede APÓS o pedido HTTP ter sido enviado não prova rejeição:
 * a Meta pode ter aceite a mensagem. Nesses casos → NÃO retry cego (ambiguous).
 */

export type MetaFailureKind =
  | "transient_http"
  | "rate_limited"
  | "permanent_http"
  | "auth_config"
  | "network"
  | "timeout"
  | "ambiguous"
  | "unknown";

export type MetaRetryDecision = "retry" | "no_retry" | "ambiguous_no_retry";

export class MetaApiError extends Error {
  readonly kind: MetaFailureKind;
  readonly httpStatus?: number;
  readonly retryAfterMs?: number;
  readonly decision: MetaRetryDecision;

  constructor(opts: {
    message: string;
    kind: MetaFailureKind;
    decision: MetaRetryDecision;
    httpStatus?: number;
    retryAfterMs?: number;
  }) {
    super(opts.message);
    this.name = "MetaApiError";
    this.kind = opts.kind;
    this.decision = opts.decision;
    this.httpStatus = opts.httpStatus;
    this.retryAfterMs = opts.retryAfterMs;
  }
}

export function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const asInt = Number(header);
  if (Number.isFinite(asInt) && asInt >= 0) return Math.min(asInt * 1000, 60_000);
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    const delta = date - Date.now();
    if (delta > 0) return Math.min(delta, 60_000);
  }
  return undefined;
}

/** Classifica resposta HTTP Meta (antes de consumir como sucesso). */
export function classifyMetaHttpStatus(
  status: number,
  retryAfterHeader?: string | null
): { kind: MetaFailureKind; decision: MetaRetryDecision; retryAfterMs?: number } {
  if (status === 429) {
    return {
      kind: "rate_limited",
      decision: "retry",
      retryAfterMs: parseRetryAfterMs(retryAfterHeader ?? null),
    };
  }
  if (status === 401 || status === 403) {
    return { kind: "auth_config", decision: "no_retry" };
  }
  if (status >= 500 && status <= 599) {
    return { kind: "transient_http", decision: "retry" };
  }
  if (status >= 400 && status <= 499) {
    return { kind: "permanent_http", decision: "no_retry" };
  }
  return { kind: "unknown", decision: "no_retry" };
}

/**
 * Falhas de fetch sem HTTP status.
 * Timeout/Abort/TypeError de rede → ambiguous_no_retry (possível aceitação Meta).
 */
export function classifyMetaFetchFailure(err: unknown): {
  kind: MetaFailureKind;
  decision: MetaRetryDecision;
} {
  const name = err instanceof Error ? err.name : "";
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

  if (name === "AbortError" || msg.includes("aborted") || msg.includes("timeout")) {
    return { kind: "timeout", decision: "ambiguous_no_retry" };
  }
  if (
    name === "TypeError" ||
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("socket")
  ) {
    return { kind: "network", decision: "ambiguous_no_retry" };
  }
  return { kind: "unknown", decision: "ambiguous_no_retry" };
}

export function shouldRetryMetaFailure(decision: MetaRetryDecision): boolean {
  return decision === "retry";
}
