/**
 * Event bus simples para eventos de domínio do módulo financeiro.
 * Suporta múltiplos handlers por evento; handlers são invocados de forma síncrona.
 */

import type { FinanceDomainEvent, FinanceEventPayload } from "./financeEvents";

export type FinanceEventHandler = (
  eventName: FinanceDomainEvent | string,
  payload: FinanceEventPayload
) => void;

const handlersByEvent = new Map<string, FinanceEventHandler[]>();
const wildcardHandlers: FinanceEventHandler[] = [];

function getHandlers(eventName: string): FinanceEventHandler[] {
  const specific = handlersByEvent.get(eventName) ?? [];
  return [...wildcardHandlers, ...specific];
}

export function subscribe(
  eventName: FinanceDomainEvent | string | "*",
  handler: FinanceEventHandler
): void {
  if (eventName === "*") {
    wildcardHandlers.push(handler);
  } else {
    const list = handlersByEvent.get(eventName) ?? [];
    list.push(handler);
    handlersByEvent.set(eventName, list);
  }
}

export function emit(
  eventName: FinanceDomainEvent | string,
  payload: FinanceEventPayload = {}
): void {
  const fullPayload: FinanceEventPayload = {
    ...payload,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };
  const handlers = getHandlers(eventName);
  for (const handler of handlers) {
    try {
      handler(eventName, fullPayload);
    } catch (err) {
      console.error("[finance.eventBus] handler error", eventName, err);
    }
  }
}
