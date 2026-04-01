import { monthHasWeakExpenseCategories } from "@/modules/financeiro/lib/monthFinanceQuality";
import type { FinanceiroMonthlyTaskInput } from "@/modules/financeiro/routine/types";
import {
  currentMonthKey,
  daysSinceIsoDate,
  filterExpensesInMonth,
  filterIncomesInMonth,
  latestDateInMonthRecords,
  sumAmount,
} from "@/modules/financeiro/insights/monthMetrics";
import type { FinanceiroHealthScoreResult, HealthScoreBreakdownItem, HealthScoreLevel } from "./types";

function levelFromScore(score: number): { level: HealthScoreLevel; headlineLabel: string } {
  if (score <= 30) return { level: "critical", headlineLabel: "Crítico" };
  if (score <= 60) return { level: "warning", headlineLabel: "Atenção" };
  if (score <= 85) return { level: "progress", headlineLabel: "Em progresso" };
  return { level: "good", headlineLabel: "Organizado" };
}

function ctaFromLevel(level: HealthScoreLevel): string {
  switch (level) {
    case "critical":
      return "Foque em registrar receitas e despesas do mês — é a base de tudo.";
    case "warning":
      return "Complete os lançamentos e refine categorias para ganhar clareza.";
    case "progress":
      return "Falta pouco: regras e atualização frequente fecham o ciclo.";
    default:
      return "Parabéns — mantenha o hábito e revise o resumo todo mês.";
  }
}

function pickLowestFactor(breakdown: HealthScoreBreakdownItem[]): string {
  const failed = breakdown.filter((b) => !b.passed);
  if (failed.length === 0) return "none";
  return failed.reduce((a, b) => (b.weight > a.weight ? b : a)).id;
}

function pickHighestFactor(breakdown: HealthScoreBreakdownItem[]): string {
  const ok = breakdown.filter((b) => b.passed);
  if (ok.length === 0) return "none";
  return ok.reduce((a, b) => (b.weight > a.weight ? b : a)).id;
}

/** Expõe fatores para analytics (viewed). */
export function getHealthScoreFactors(breakdown: HealthScoreBreakdownItem[]): {
  lowest_factor: string;
  highest_factor: string;
} {
  return {
    lowest_factor: pickLowestFactor(breakdown),
    highest_factor: pickHighestFactor(breakdown),
  };
}

export type { FinanceiroHealthScoreResult, HealthScoreBreakdownItem, HealthScoreLevel } from "./types";

/**
 * Score 0–100 por soma de critérios (mesmos dados que checklist/insights).
 * Pesos: receita 20, despesa 20, categorias 20, regras 15, consistência do mês 15, frescor 10.
 */
export function getFinanceiroHealthScore(input: FinanceiroMonthlyTaskInput): FinanceiroHealthScoreResult {
  const now = input.now ?? new Date();
  const monthKey = currentMonthKey(now);
  const monthIncomes = filterIncomesInMonth(input.incomes, monthKey);
  const monthExpenses = filterExpensesInMonth(input.expenses, monthKey);
  const isOwner = input.activeMembershipRole !== "MEMBER";

  const hasIncome = monthIncomes.length > 0;
  const hasExpense = monthExpenses.length > 0;
  const monthInc = sumAmount(monthIncomes);
  const monthExp = sumAmount(monthExpenses);
  const weakCats = monthHasWeakExpenseCategories(monthExpenses);
  const categoriesOk = monthExpenses.length === 0 || !weakCats;
  const rulesOk = !isOwner || input.rulesCount > 0;
  /** Mesmo critério do checklist “Conferir resumo do mês”. */
  const monthConsistent = monthInc > 0 && monthExp > 0;

  const latestInMonth = latestDateInMonthRecords(monthIncomes, monthExpenses);
  const staleDays = latestInMonth ? daysSinceIsoDate(latestInMonth, now) : null;
  const freshnessOk =
    monthIncomes.length + monthExpenses.length === 0 ||
    latestInMonth == null ||
    (staleDays != null && staleDays < 14);

  const breakdown: HealthScoreBreakdownItem[] = [
    {
      id: "score_income",
      label: "Receitas no mês",
      passed: hasIncome,
      weight: 20,
    },
    {
      id: "score_expense",
      label: "Despesas no mês",
      passed: hasExpense,
      weight: 20,
    },
    {
      id: "score_categories",
      label: "Categorias úteis",
      passed: categoriesOk,
      weight: 20,
    },
    {
      id: "score_rules",
      label: isOwner ? "Regras de rateio" : "Regras (não aplicável)",
      passed: rulesOk,
      weight: 15,
    },
    {
      id: "score_consistency",
      label: "Consistência do mês (receita + despesa)",
      passed: monthConsistent,
      weight: 15,
    },
    {
      id: "score_freshness",
      label: "Lançamentos recentes",
      passed: freshnessOk,
      weight: 10,
    },
  ];

  const score = breakdown.reduce((acc, b) => acc + (b.passed ? b.weight : 0), 0);

  const { level, headlineLabel } = levelFromScore(score);

  return {
    score,
    level,
    headlineLabel,
    breakdown,
    ctaHint: ctaFromLevel(level),
  };
}
