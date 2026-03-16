/**
 * Eventos de domínio do módulo financeiro.
 * Usados pelo event bus para logging, métricas e futuras automações.
 */

export type FinanceDomainEvent =
  | "finance.expense.created"
  | "finance.expense.updated"
  | "finance.expense.deleted"
  | "finance.income.created"
  | "finance.rule.created"
  | "finance.rule.updated"
  | "finance.household.member_added"
  | "finance.household.member_removed"
  | "finance.household.transfer"
  | "finance.invite.sent"
  | "finance.goal.updated";

export type FinanceEventPayload = {
  householdId?: string;
  userId?: string;
  entityId?: string;
  timestamp?: string;
  [key: string]: unknown;
};
