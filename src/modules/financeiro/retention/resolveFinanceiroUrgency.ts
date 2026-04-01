import { toDateOnly } from "@/lib/dates";
import { daysSinceIsoDate, latestActivityDate } from "@/modules/financeiro/insights/monthMetrics";
import type { FinanceiroMonthlyTask } from "@/modules/financeiro/routine/types";
import { FINANCEIRO_EXPENSES_PATH } from "@/modules/financeiro/navigation/constants";
import { localDateOnly } from "./localDateOnly";

export type FinanceiroUrgencyKind = "stale" | "today_missing" | "incomplete";

export type FinanceiroUrgencyPayload = {
  kind: FinanceiroUrgencyKind;
  pendingCount: number;
  message: string;
  ctaLabel: string;
  ctaHref: string;
};

export function hasFinanceiroMovementToday(
  now: Date,
  incomes: { receivedAt?: string | null }[],
  expenses: { dueDate?: string | null }[]
): boolean {
  return hasMovementOnLocalDay(incomes, expenses, localDateOnly(now));
}

function hasMovementOnLocalDay(
  incomes: { receivedAt?: string | null }[],
  expenses: { dueDate?: string | null }[],
  isoDay: string
): boolean {
  for (const i of incomes) {
    if (i.receivedAt && toDateOnly(i.receivedAt) === isoDay) return true;
  }
  for (const e of expenses) {
    if (e.dueDate && toDateOnly(e.dueDate) === isoDay) return true;
  }
  return false;
}

/**
 * Uma única urgência por vez (prioridade: dados velhos → nada hoje → checklist).
 */
export function resolveFinanceiroUrgency(input: {
  now: Date;
  incomes: { receivedAt?: string | null }[];
  expenses: { dueDate?: string | null }[];
  tasks: FinanceiroMonthlyTask[];
}): FinanceiroUrgencyPayload | null {
  const today = localDateOnly(input.now);
  const pending = input.tasks.filter((t) => !t.completed);
  const pendingCount = pending.length;
  const total = input.incomes.length + input.expenses.length;
  const latest = latestActivityDate(input.incomes, input.expenses);
  const daysSince = latest != null ? daysSinceIsoDate(latest, input.now) : null;

  const expensesHref = FINANCEIRO_EXPENSES_PATH;
  const firstPendingHref = pending[0]?.cta.href ?? `${expensesHref}#nova-despesa`;

  if (total === 0) {
    return {
      kind: "today_missing",
      pendingCount,
      message: "Seu financeiro de hoje ainda não foi atualizado",
      ctaLabel: "Adicionar movimentação",
      ctaHref: `${expensesHref}#nova-receita`,
    };
  }

  if (daysSince != null && daysSince >= 3) {
    return {
      kind: "stale",
      pendingCount,
      message: "Seu mês pode estar desatualizado",
      ctaLabel: "Atualizar hoje",
      ctaHref: `${expensesHref}#nova-despesa`,
    };
  }

  if (!hasMovementOnLocalDay(input.incomes, input.expenses, today)) {
    return {
      kind: "today_missing",
      pendingCount,
      message: "Seu financeiro de hoje ainda não foi atualizado",
      ctaLabel: "Adicionar movimentação",
      ctaHref: `${expensesHref}#nova-receita`,
    };
  }

  if (pendingCount > 0) {
    return {
      kind: "incomplete",
      pendingCount,
      message: `Faltam ${pendingCount} ${pendingCount === 1 ? "ação" : "ações"} para fechar seu mês`,
      ctaLabel: "Completar agora",
      ctaHref: firstPendingHref,
    };
  }

  return null;
}
