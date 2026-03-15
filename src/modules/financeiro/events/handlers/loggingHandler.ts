/**
 * Handler de logging: registra todos os eventos do domínio via financeLogger.
 */
import { financeLogger } from "@/modules/financeiro/adapters/observability";
import { subscribe } from "../financeEventBus";

function handle(eventName: string, payload: Record<string, unknown>): void {
  financeLogger.info(eventName, {
    ...payload,
    module: "finance",
    event: eventName,
  });
}

export function registerLoggingHandler(): void {
  subscribe("*", handle);
}
