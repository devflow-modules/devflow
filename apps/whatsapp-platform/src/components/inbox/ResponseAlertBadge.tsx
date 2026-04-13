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

  const styles =
    level === "critical"
      ? "border-red-200/90 bg-red-50 text-red-900 ring-red-200/50"
      : "border-amber-200/90 bg-amber-50 text-amber-950 ring-amber-200/60";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ring-1 ${styles} ${className}`.trim()}
      data-testid="response-alert-badge"
      data-alert-level={level}
      title={m > 0 ? `À espera há ~${m} min` : "À espera de resposta"}
    >
      {label}
      {m > 0 ? <span className="tabular-nums opacity-90">· {m}m</span> : null}
    </span>
  );
}
