/**
 * Handler de métricas: incrementa contadores conforme eventos do domínio.
 */
import { increment } from "@/modules/financeiro/adapters/metrics/financeMetrics";
import type { FinanceDomainEvent } from "../financeEvents";
import { subscribe } from "../financeEventBus";

const EVENT_TO_METRIC: Record<string, string> = {
  "finance.expense.created": "finance.expenses.created.count",
  "finance.expense.updated": "finance.expenses.updated.count",
  "finance.expense.deleted": "finance.expenses.deleted.count",
  "finance.income.created": "finance.incomes.created.count",
  "finance.rule.created": "finance.rules.created.count",
  "finance.rule.updated": "finance.rules.updated.count",
  "finance.household.member_added": "finance.households.members.added.count",
  "finance.household.member_removed": "finance.households.members.removed.count",
  "finance.household.transfer": "finance.households.transfer.count",
  "finance.invite.sent": "finance.invites.sent.count",
  "finance.goal.updated": "finance.goals.updated.count",
};

function handle(eventName: FinanceDomainEvent | string): void {
  const metric = EVENT_TO_METRIC[eventName];
  if (metric) {
    increment(metric);
  }
}

export function registerMetricsHandler(): void {
  Object.keys(EVENT_TO_METRIC).forEach((eventName) => {
    subscribe(eventName, (name) => {
      handle(name);
    });
  });
}
