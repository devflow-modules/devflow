import { toDateOnly } from "@/lib/dates";

export function currentMonthKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function hasIncomeInCurrentMonth(
  incomes: { receivedAt?: string | null }[],
  date = new Date()
): boolean {
  const key = currentMonthKey(date);
  return incomes.some((r) => {
    if (!r.receivedAt) return false;
    return toDateOnly(r.receivedAt).slice(0, 7) === key;
  });
}

export function hasExpenseInCurrentMonth(
  expenses: { dueDate?: string | null }[],
  date = new Date()
): boolean {
  const key = currentMonthKey(date);
  return expenses.some((e) => {
    if (!e.dueDate) return false;
    return toDateOnly(e.dueDate).slice(0, 7) === key;
  });
}
