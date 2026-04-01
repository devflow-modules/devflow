import { toDateOnly } from "@/lib/dates";

export function currentMonthKey(now: Date): string {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function filterIncomesInMonth<T extends { receivedAt?: string | null }>(
  records: T[],
  monthKey: string
): T[] {
  return records.filter((r) => {
    if (!r.receivedAt) return false;
    return toDateOnly(r.receivedAt).slice(0, 7) === monthKey;
  });
}

export function filterExpensesInMonth<T extends { dueDate?: string | null }>(
  records: T[],
  monthKey: string
): T[] {
  return records.filter((r) => {
    if (!r.dueDate) return false;
    return toDateOnly(r.dueDate).slice(0, 7) === monthKey;
  });
}

export function sumAmount<T extends { amount: number }>(records: T[]): number {
  return records.reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
}

/** Última data de atividade (ISO date yyyy-mm-dd) entre receitas e despesas. */
export function latestActivityDate(
  incomes: { receivedAt?: string | null }[],
  expenses: { dueDate?: string | null }[]
): string | null {
  const dates: string[] = [];
  for (const i of incomes) {
    if (i.receivedAt) dates.push(toDateOnly(i.receivedAt));
  }
  for (const e of expenses) {
    if (e.dueDate) dates.push(toDateOnly(e.dueDate));
  }
  if (dates.length === 0) return null;
  return dates.sort().at(-1) ?? null;
}

export function daysSinceIsoDate(iso: string, now: Date): number {
  const t = new Date(iso + "T12:00:00").getTime();
  return Math.floor((now.getTime() - t) / (1000 * 60 * 60 * 24));
}

/** Data mais recente entre lançamentos já filtrados ao mês corrente. */
export function latestDateInMonthRecords<
  I extends { receivedAt?: string | null },
  E extends { dueDate?: string | null },
>(monthIncomes: I[], monthExpenses: E[]): string | null {
  const dates: string[] = [];
  for (const i of monthIncomes) {
    if (i.receivedAt) dates.push(toDateOnly(i.receivedAt));
  }
  for (const e of monthExpenses) {
    if (e.dueDate) dates.push(toDateOnly(e.dueDate));
  }
  if (dates.length === 0) return null;
  return dates.sort().at(-1) ?? null;
}
