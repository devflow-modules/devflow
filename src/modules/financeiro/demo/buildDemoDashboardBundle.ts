import { toDateOnly } from "@/lib/dates";
import { getFinanceiroHealthScore } from "@/modules/financeiro/health/getFinanceiroHealthScore";
import { getFinanceiroInsights } from "@/modules/financeiro/insights/getFinanceiroInsights";
import { getFinanceiroMonthlyTasks } from "@/modules/financeiro/routine/getFinanceiroMonthlyTasks";

/**
 * Dados fictícios do mês atual — estado “em progresso” (score, insight forte, checklist parcial).
 * Não persiste; só para `/ferramentas/financeiro/demo`.
 */
export function buildDemoDashboardBundle(now = new Date()) {
  const d = toDateOnly(now);
  const incomes = [{ amount: 9200, receivedAt: d }];
  const expenses = [
    { amount: 2100, dueDate: d, category: "Moradia" },
    { amount: 1400, dueDate: d, category: "Alimentação" },
  ];
  /** Último mês com despesas menores → insight “gastos acima do padrão”. */
  const summarySeries = [
    { label: "M-2", incomes: 7800, expenses: 2100, balance: 5700 },
    { label: "M-1", incomes: 8800, expenses: 2400, balance: 6400 },
    { label: "Atual", incomes: 9200, expenses: 5200, balance: 4000 },
  ];

  const rulesCount = 0;
  const activeMembershipRole = "OWNER" as const;

  const healthScore = getFinanceiroHealthScore({
    now,
    incomes,
    expenses,
    rulesCount,
    activeMembershipRole,
  });

  const insights = getFinanceiroInsights({
    now,
    incomes,
    expenses,
    rulesCount,
    activeMembershipRole,
    summarySeries,
  });

  const tasks = getFinanceiroMonthlyTasks({
    now,
    incomes,
    expenses,
    rulesCount,
    activeMembershipRole,
  });

  return {
    healthScore,
    insights,
    tasks,
    householdId: "demo-household",
  };
}
