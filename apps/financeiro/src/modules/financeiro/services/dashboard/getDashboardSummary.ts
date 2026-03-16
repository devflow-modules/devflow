import type { PrismaClient } from "@prisma/client";

function startOfMonthUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonthsUTC(date: Date, delta: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

export type GetDashboardSummaryParams = {
  householdId: string;
  months?: number;
};

export type DashboardSeriesItem = {
  key: string;
  label: string;
  incomes: number;
  expenses: number;
  balance: number;
};

export async function getDashboardSummary(
  prisma: PrismaClient,
  params: GetDashboardSummaryParams
): Promise<{ series: DashboardSeriesItem[] }> {
  const months = params.months ? Math.max(1, Math.min(24, params.months)) : 6;
  const now = new Date();
  const end = addMonthsUTC(startOfMonthUTC(now), 1);
  const start = addMonthsUTC(startOfMonthUTC(now), -months + 1);

  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({
      where: {
        householdId: params.householdId,
        status: "RECEIVED",
        receivedAt: { gte: start, lt: end },
      },
      select: { amount: true, receivedAt: true },
    }),
    prisma.expense.findMany({
      where: {
        householdId: params.householdId,
        dueDate: { gte: start, lt: end },
      },
      select: { amount: true, dueDate: true, status: true },
    }),
  ]);

  const buckets = Array.from({ length: months }).map((_, idx) => {
    const d = addMonthsUTC(start, idx);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return { key, year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, incomes: 0, expenses: 0 };
  });
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  for (const income of incomes) {
    const d = income.receivedAt;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.incomes += Number(income.amount ?? 0);
  }

  for (const expense of expenses) {
    if (expense.status === "PAID") continue;
    const d = expense.dueDate;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.expenses += Number(expense.amount ?? 0);
  }

  const series = buckets.map((b) => ({
    key: b.key,
    label: `${String(b.month).padStart(2, "0")}/${String(b.year).slice(-2)}`,
    incomes: Number(b.incomes.toFixed(2)),
    expenses: Number(b.expenses.toFixed(2)),
    balance: Number((b.incomes - b.expenses).toFixed(2)),
  }));

  return { series };
}
