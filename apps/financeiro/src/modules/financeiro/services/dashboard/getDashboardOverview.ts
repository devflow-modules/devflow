import type { PrismaClient } from "@prisma/client";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export type CategoryBreakdownItem = {
  categoryId: string | null;
  categoryName: string;
  color: string | null;
  value: number;
  percentage: number;
};

export type BudgetProgressItem = {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  color: string;
  spent: number;
  monthlyLimit: number;
  percent: number;
};

export type DashboardOverviewResult = {
  totalSpent: number;
  categoryBreakdown: CategoryBreakdownItem[];
  budgetProgress: BudgetProgressItem[];
};

export async function getDashboardOverview(
  prisma: PrismaClient,
  householdId: string
): Promise<DashboardOverviewResult> {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const [expenses, budgets] = await Promise.all([
    prisma.expense.findMany({
      where: {
        householdId,
        dueDate: { gte: start, lte: end },
      },
      select: {
        amount: true,
        categoryId: true,
        category: true,
        categoryRef: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.budget.findMany({
      where: { householdId },
      include: { category: true },
    }),
  ]);

  let totalSpent = 0;
  const byCategoryKey = new Map<string, { categoryId: string | null; name: string; color: string | null; value: number }>();

  for (const e of expenses) {
    const amount = Number(e.amount ?? 0);
    totalSpent += amount;
    const name = e.categoryRef?.name ?? e.category ?? "Outros";
    const key = e.categoryId ?? `legacy:${name}`;
    const existing = byCategoryKey.get(key);
    if (existing) {
      existing.value += amount;
    } else {
      byCategoryKey.set(key, {
        categoryId: e.categoryRef?.id ?? null,
        name,
        color: e.categoryRef?.color ?? null,
        value: amount,
      });
    }
  }

  const totalForPct = totalSpent || 1;
  const categoryBreakdown: CategoryBreakdownItem[] = Array.from(byCategoryKey.values()).map((c) => ({
    categoryId: c.categoryId,
    categoryName: c.name,
    color: c.color,
    value: Number(c.value.toFixed(2)),
    percentage: Number(((c.value / totalForPct) * 100).toFixed(1)),
  }));

  const spentByCategoryId = new Map<string, number>();
  for (const e of expenses) {
    if (e.categoryId) {
      spentByCategoryId.set(e.categoryId, (spentByCategoryId.get(e.categoryId) ?? 0) + Number(e.amount ?? 0));
    }
  }

  const budgetProgress: BudgetProgressItem[] = budgets.map((b) => {
    const spent = Number((spentByCategoryId.get(b.categoryId) ?? 0).toFixed(2));
    const limit = Number(b.monthlyLimit);
    const percent = limit > 0 ? Math.min(100, Number(((spent / limit) * 100).toFixed(1))) : 0;
    return {
      budgetId: b.id,
      categoryId: b.category.id,
      categoryName: b.category.name,
      color: b.category.color ?? "#6366f1",
      spent,
      monthlyLimit: limit,
      percent,
    };
  });

  return {
    totalSpent: Number(totalSpent.toFixed(2)),
    categoryBreakdown: categoryBreakdown.sort((a, b) => b.value - a.value),
    budgetProgress,
  };
}
