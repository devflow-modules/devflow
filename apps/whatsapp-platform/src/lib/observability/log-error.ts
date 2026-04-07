import { bumpMetric } from "./metrics";
import { logEvent } from "./log-event";
import type { LogSource } from "./log-event";

/**
 * Erros operacionais padronizados: incrementa métrica `errors` e regista JSON.
 */
export function logError(
  source: LogSource,
  err: unknown,
  context?: Record<string, unknown>
): void {
  bumpMetric("errors");
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  logEvent("error", source, "exception", {
    message,
    ...(stack ? { stack } : {}),
    ...context,
  });
}
