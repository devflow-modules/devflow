import { toDateOnly } from "@/lib/dates";
import {
  daysSinceIsoDate,
  latestActivityDate,
} from "@/modules/financeiro/insights/monthMetrics";
import {
  FINANCEIRO_DASHBOARD_PATH,
  FINANCEIRO_EXPENSES_PATH,
} from "@/modules/financeiro/navigation/constants";

export type RetentionUrgencyKind = "stale" | "today_missing" | "incomplete";

export type RetentionUrgency = {
  kind: RetentionUrgencyKind;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  pendingCount?: number;
};

const EXPENSES_MOVEMENT = `${FINANCEIRO_EXPENSES_PATH}#nova-despesa`;

export function hasMovementOnCalendarDay(
  incomes: { receivedAt?: string | null }[],
  expenses: { dueDate?: string | null }[],
  dayIso: string
): boolean {
  for (const i of incomes) {
    if (i.receivedAt && toDateOnly(i.receivedAt) === dayIso) return true;
  }
  for (const e of expenses) {
    if (e.dueDate && toDateOnly(e.dueDate) === dayIso) return true;
  }
  return false;
}

/**
 * Uma única urgência por vez (prioridade: desatualizado há dias → nada hoje → checklist).
 */
export function computeRetentionUrgency(
  incomes: { receivedAt?: string | null }[],
  expenses: { dueDate?: string | null }[],
  pendingChecklistCount: number,
  now: Date
): RetentionUrgency | null {
  const today = toDateOnly(now);
  const last = latestActivityDate(incomes, expenses);
  const hasToday = hasMovementOnCalendarDay(incomes, expenses, today);

  if (last) {
    const daysSince = daysSinceIsoDate(last, now);
    if (daysSince >= 3) {
      return {
        kind: "stale",
        message: "Seu mês pode estar desatualizado",
        ctaLabel: "Atualizar hoje",
        ctaHref: EXPENSES_MOVEMENT,
      };
    }
  }

  if (!hasToday) {
    return {
      kind: "today_missing",
      message: "Seu financeiro de hoje ainda não foi atualizado",
      ctaLabel: "Adicionar movimentação",
      ctaHref: EXPENSES_MOVEMENT,
    };
  }

  if (pendingChecklistCount > 0) {
    const n = pendingChecklistCount;
    return {
      kind: "incomplete",
      message: `Faltam ${n} ${n === 1 ? "ação" : "ações"} para fechar seu mês`,
      ctaLabel: "Completar agora",
      ctaHref: `${FINANCEIRO_DASHBOARD_PATH}#checklist-mes`,
      pendingCount: n,
    };
  }

  return null;
}
