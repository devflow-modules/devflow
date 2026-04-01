import { FINANCEIRO_BASE_PATH } from "@/modules/financeiro/navigation/constants";
import { monthHasWeakExpenseCategories } from "@/modules/financeiro/lib/monthFinanceQuality";
import {
  currentMonthKey,
  filterExpensesInMonth,
  filterIncomesInMonth,
  sumAmount,
} from "@/modules/financeiro/insights/monthMetrics";
import type { FinanceiroMonthlyTask, FinanceiroMonthlyTaskInput } from "./types";

const B = FINANCEIRO_BASE_PATH;
const MAX_TASKS = 5;

/**
 * Checklist da rotina mensal (hábito de uso). Complementa insights: aqui o foco é “fechar o mês”.
 * Máx. 5 itens; pendentes primeiro (por prioridade), depois concluídos.
 */
export function getFinanceiroMonthlyTasks(input: FinanceiroMonthlyTaskInput): FinanceiroMonthlyTask[] {
  const now = input.now ?? new Date();
  const monthKey = currentMonthKey(now);
  const monthIncomes = filterIncomesInMonth(input.incomes, monthKey);
  const monthExpenses = filterExpensesInMonth(input.expenses, monthKey);
  const monthInc = sumAmount(monthIncomes);
  const monthExp = sumAmount(monthExpenses);
  const role = input.activeMembershipRole;
  const isOwner = role !== "MEMBER";

  const candidates: FinanceiroMonthlyTask[] = [
    {
      id: "task_income",
      priority: 1,
      title: "Adicionar ao menos 1 receita no mês",
      completed: monthIncomes.length > 0,
      cta: { label: "Adicionar receita", href: `${B}/expenses#nova-receita` },
    },
    {
      id: "task_expense",
      priority: 2,
      title: "Registrar despesas do mês",
      completed: monthExpenses.length > 0,
      cta: { label: "Registrar despesa", href: `${B}/expenses#nova-despesa` },
    },
    {
      id: "task_categories",
      priority: 3,
      title: "Revisar categorias das despesas",
      completed: !monthHasWeakExpenseCategories(monthExpenses),
      cta: { label: "Revisar categorias", href: `${B}/expenses#categorias` },
    },
    ...(isOwner
      ? ([
          {
            id: "task_rules",
            priority: 4,
            title: "Criar regra automática (rateio)",
            completed: input.rulesCount > 0,
            cta: { label: "Criar regra", href: `${B}/rules` },
          },
        ] satisfies FinanceiroMonthlyTask[])
      : []),
    {
      id: "task_summary",
      priority: isOwner ? 5 : 4,
      title: "Conferir resumo do mês",
      completed: monthInc > 0 && monthExp > 0,
      cta: { label: "Ver resumo", href: `${B}/dashboard#resumo-mes` },
    },
  ];

  const pending = candidates.filter((t) => !t.completed).sort((a, b) => a.priority - b.priority);
  const done = candidates.filter((t) => t.completed).sort((a, b) => a.priority - b.priority);
  return [...pending, ...done].slice(0, MAX_TASKS);
}
