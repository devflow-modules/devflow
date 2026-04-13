import { sanitizeLogData } from "./sanitize";

export type LogLevel = "info" | "warn" | "error";

export type LogSource =
  | "auth"
  | "inbox"
  | "admin"
  | "webhook"
  | "ops"
  | "billing"
  | "automation"
  | "security"
  | "app"
  | "email"
  | "support";

/** Correlação ponta a ponta (grep por `trace_id` + `tenant_id`). */
export type LogCorrelation = {
  trace_id?: string;
  tenant_id?: string;
};

/**
 * Log estruturado JSON (uma linha). Prefixo [source] para grep.
 * Campos estáveis: `event` / `event_type`, `trace_id`, `tenant_id` quando fornecidos em `correlation`.
 */
export function logEvent(
  level: LogLevel,
  source: LogSource,
  event: string,
  data?: Record<string, unknown>,
  correlation?: LogCorrelation
): void {
  const base: Record<string, unknown> = {
    ts: new Date().toISOString(),
    source,
    event,
    event_type: event,
    ...(correlation?.trace_id ? { trace_id: correlation.trace_id } : {}),
    ...(correlation?.tenant_id ? { tenant_id: correlation.tenant_id } : {}),
    ...(data ? sanitizeLogData(data as Record<string, unknown>) : {}),
  };
  const line = JSON.stringify(base);
  if (level === "error") console.error(`[${source}]`, line);
  else if (level === "warn") console.warn(`[${source}]`, line);
  else console.info(`[${source}]`, line);
}
