"use client";

/** >5 min aviso; >10 min crítico (alinhado ao sprint de polish). */
export const RESPONSE_ALERT_WARNING_MS = 5 * 60 * 1000;
export const RESPONSE_ALERT_CRITICAL_MS = 10 * 60 * 1000;

export type ResponseAlertLevel = "none" | "warning" | "critical";

export function getResponseAlertLevel(delayMs: number | null | undefined): ResponseAlertLevel {
  if (delayMs == null || !Number.isFinite(delayMs) || delayMs < RESPONSE_ALERT_WARNING_MS) {
    return "none";
  }
  if (delayMs >= RESPONSE_ALERT_CRITICAL_MS) return "critical";
  return "warning";
}

type ResponseAlertBadgeProps = {
  delayMs: number | null | undefined;
  className?: string;
};

/**
 * Indicador de atraso na resposta (lista de conversas).
 */
export function ResponseAlertBadge({ delayMs, className = "" }: ResponseAlertBadgeProps) {
  const level = getResponseAlertLevel(delayMs);
  if (level === "none") return null;

  const m = Math.floor((delayMs ?? 0) / 60000);
  const label = level === "critical" ? "Crítico" : "Atenção";

  const styles = level === "critical" ? "df-badge-error" : "df-badge-warning";

  return (
    <span
      className={`df-inbox-list-chip inline-flex items-center gap-1 !rounded-md px-1.5 py-0.5 font-semibold !normal-case !tracking-normal ${styles} ${className}`.trim()}
      data-testid="response-alert-badge"
      data-alert-level={level}
      title={m > 0 ? `À espera há ~${m} min` : "À espera de resposta"}
    >
      {label}
      {m > 0 ? <span className="tabular-nums opacity-90">· {m}m</span> : null}
    </span>
  );
}
