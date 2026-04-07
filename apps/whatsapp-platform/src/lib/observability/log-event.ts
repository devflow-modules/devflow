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
  | "app";

/**
 * Log estruturado JSON (uma linha). Prefixo [source] para grep.
 */
export function logEvent(
  level: LogLevel,
  source: LogSource,
  event: string,
  data?: Record<string, unknown>
): void {
  const base: Record<string, unknown> = {
    ts: new Date().toISOString(),
    source,
    event,
    ...(data ? sanitizeLogData(data as Record<string, unknown>) : {}),
  };
  const line = JSON.stringify(base);
  if (level === "error") console.error(`[${source}]`, line);
  else if (level === "warn") console.warn(`[${source}]`, line);
  else console.info(`[${source}]`, line);
}
