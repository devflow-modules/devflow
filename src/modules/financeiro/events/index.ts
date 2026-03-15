/**
 * Eventos de domínio do módulo financeiro.
 * Ao importar deste módulo, os handlers padrão (logging + métricas) são registrados.
 */
import { registerDefaultHandlers } from "./handlers";

export type { FinanceDomainEvent, FinanceEventPayload } from "./financeEvents";
export { emit, subscribe } from "./financeEventBus";

registerDefaultHandlers();
