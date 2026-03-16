/**
 * Registra os handlers padrão do event bus (logging + métricas).
 * Importar este módulo uma vez na aplicação (ex.: ao carregar rotas do financeiro).
 */
import { registerLoggingHandler } from "./loggingHandler";
import { registerMetricsHandler } from "./metricsHandler";

let registered = false;

export function registerDefaultHandlers(): void {
  if (registered) return;
  registerLoggingHandler();
  registerMetricsHandler();
  registered = true;
}
