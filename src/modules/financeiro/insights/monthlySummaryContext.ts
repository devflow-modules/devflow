import {
  currentMonthKey,
  filterExpensesInMonth,
  filterIncomesInMonth,
  sumAmount,
} from "./monthMetrics";

type IncomeLike = { amount: number; receivedAt?: string | null };
type ExpenseLike = { amount: number; dueDate?: string | null; category?: string | null };

export type MonthlySummaryContextInput = {
  now?: Date;
  incomes: IncomeLike[];
  expenses: ExpenseLike[];
  summarySeries?: { label: string; incomes: number; expenses: number; balance: number }[];
};

/**
 * Frases curtas para o bloco “resumo com contexto” (sem números duplicados dos cards).
 */
export function getMonthlySummaryContextLines(
  input: MonthlySummaryContextInput,
  formatCurrency: (n: number) => string
): string[] {
  const now = input.now ?? new Date();
  const monthKey = currentMonthKey(now);
  const mIn = filterIncomesInMonth(input.incomes, monthKey);
  const mEx = filterExpensesInMonth(input.expenses, monthKey);
  const inc = sumAmount(mIn);
  const exp = sumAmount(mEx);
  const lines: string[] = [];

  if (inc === 0 && exp === 0) {
    lines.push("Nenhum lançamento no mês atual ainda.");
    return lines;
  }

  if (inc === 0) lines.push("Você ainda não registrou receitas neste mês.");
  if (exp === 0) lines.push("Você ainda não registrou despesas neste mês.");

  const series = input.summarySeries ?? [];
  if (series.length >= 2) {
    const prevE = series[series.length - 2]?.expenses ?? 0;
    const lastE = series[series.length - 1]?.expenses ?? 0;
    if (prevE > 0) {
      if (lastE > prevE * 1.05) {
        const pct = Math.round(((lastE - prevE) / prevE) * 100);
        lines.push(`Gastos do período recente na série ~${pct}% acima do mês anterior.`);
      } else if (lastE < prevE * 0.95) {
        const pct = Math.round(((prevE - lastE) / prevE) * 100);
        lines.push(`Gastos ~${pct}% abaixo do mês anterior na série.`);
      }
    }
  }

  const byCat = mEx.reduce<Record<string, number>>((acc, e) => {
    const c = (e.category ?? "Outros").trim() || "Outros";
    acc[c] = (acc[c] ?? 0) + Number(e.amount ?? 0);
    return acc;
  }, {});
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] > 0) {
    lines.push(`Maior gasto no mês: ${top[0]} (${formatCurrency(top[1])}).`);
  }

  const balance = inc - exp;
  if (inc > 0 && exp > 0) {
    lines.push(
      balance >= 0
        ? `Saldo do mês positivo (${formatCurrency(balance)}).`
        : `Saldo do mês negativo (${formatCurrency(balance)}).`
    );
  }

  return lines.slice(0, 4);
}

export function inferDashboardPersona(input: {
  incomes: IncomeLike[];
  expenses: ExpenseLike[];
  now?: Date;
}): "primeiro_uso" | "inativo" | "ativo" {
  const now = input.now ?? new Date();
  const monthKey = currentMonthKey(now);
  const mIn = filterIncomesInMonth(input.incomes, monthKey);
  const mEx = filterExpensesInMonth(input.expenses, monthKey);
  const anyEver = input.incomes.length > 0 || input.expenses.length > 0;
  if (!anyEver) return "primeiro_uso";
  if (mIn.length === 0 && mEx.length === 0) return "inativo";
  return "ativo";
}
