import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { cashFlowProjectionQuerySchema } from "@/lib/financeiro/schema";
import {
  addMonths,
  computeMonthlyAverageBySource,
  getScenarioMultipliers,
  startOfMonth,
} from "@/lib/dashboard/cashFlowProjection";
import { dateInputToDate } from "@/lib/dates";

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function addDaysUTC(date: Date, delta: number) {
  return new Date(date.getTime() + delta * 24 * 60 * 60 * 1000);
}

function toUTCDateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function nextOccurrenceUTC(from: Date, dayOfMonth: number) {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const candidate = new Date(Date.UTC(year, month, dayOfMonth, 0, 0, 0, 0));
  if (candidate.getTime() >= from.getTime()) return candidate;
  return new Date(Date.UTC(year, month + 1, dayOfMonth, 0, 0, 0, 0));
}

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = cashFlowProjectionQuerySchema.safeParse(rawQuery);
    if (!query.success) {
      return sendError(query.error.message, 400, query.error.format());
    }

    const fromParam = query.data.from ? dateInputToDate(query.data.from) : null;
    const toParam = query.data.to ? dateInputToDate(query.data.to) : null;
    const from = startOfDayUTC(fromParam ?? new Date());

    const horizonMonths = query.data.horizonMonths ?? null;
    const horizonDays =
      query.data.horizonDays ??
      (horizonMonths ? horizonMonths * 30 : 30);

    const to = startOfDayUTC(toParam ?? addDaysUTC(from, horizonDays));
    if (to.getTime() <= from.getTime()) {
      return sendError("Intervalo inválido", 400, undefined, "INVALID_RANGE");
    }

    const householdId = auth.context.householdId;

    const avgMonths = query.data.avgMonths ?? 3;
    const scenario = query.data.scenario ?? "BASE";
    const { incomeMultiplier, expenseMultiplier } = getScenarioMultipliers(scenario);

    const avgWindowStart = startOfMonth(addMonths(from, -avgMonths));

    const [paymentDays, sources, expensesInRange, incomesForAverage, incomesBefore, expensesBefore] = await Promise.all([
      prisma.paymentDay.findMany({
        where: { source: { householdId } },
        select: { sourceId: true, dayOfMonth: true },
      }),
      prisma.source.findMany({
        where: { householdId, isActive: true },
        select: { id: true },
      }),
      prisma.expense.findMany({
        where: {
          householdId,
          dueDate: { gte: from, lte: to },
          status: { in: ["PENDING", "SCHEDULED"] },
        },
        select: { amount: true, dueDate: true },
      }),
      prisma.income.findMany({
        where: { householdId, status: "RECEIVED", sourceId: { not: null }, receivedAt: { gte: avgWindowStart, lt: from } },
        select: { sourceId: true, amount: true, receivedAt: true },
      }),
      prisma.income.findMany({
        where: { householdId, status: "RECEIVED", receivedAt: { lt: from } },
        select: { amount: true },
      }),
      prisma.expense.findMany({
        where: { householdId, dueDate: { lt: from } },
        select: { amount: true, status: true },
      }),
    ]);

    const activeSourceIds = new Set<string>(sources.map((s: { id: string }) => s.id));

    // moving average of monthly sums (last N months) per source
    const { estimateBySource: incomeEstimateBySource } = computeMonthlyAverageBySource({
      incomes: incomesForAverage.map((i: { sourceId: string | null; amount: unknown; receivedAt: Date }) => ({
        sourceId: i.sourceId,
        amount: Number(i.amount ?? 0),
        receivedAt: i.receivedAt,
      })),
      activeSourceIds,
      from,
      avgMonths,
    });

    // starting balance up to 'from'
    const totalIncomesBefore = incomesBefore.reduce((acc, i) => acc + Number(i.amount ?? 0), 0);
    const totalExpensesBefore = expensesBefore.reduce((acc, e) => (e.status === "PAID" ? acc : acc + Number(e.amount ?? 0)), 0);
    const startingBalance = totalIncomesBefore - totalExpensesBefore;

    const expectedIncomeByDay = new Map<string, number>();
    for (const pd of paymentDays) {
      if (!activeSourceIds.has(pd.sourceId)) continue;
      const estimate = (incomeEstimateBySource.get(pd.sourceId) ?? 0) * incomeMultiplier;
      if (!estimate) continue;

      let occ = nextOccurrenceUTC(from, pd.dayOfMonth);
      while (occ.getTime() <= to.getTime()) {
        const key = toUTCDateKey(occ);
        expectedIncomeByDay.set(key, (expectedIncomeByDay.get(key) ?? 0) + estimate);
        occ = nextOccurrenceUTC(addDaysUTC(occ, 1), pd.dayOfMonth);
      }
    }

    const expectedExpenseByDay = new Map<string, number>();
    for (const exp of expensesInRange) {
      const key = toUTCDateKey(startOfDayUTC(exp.dueDate));
      expectedExpenseByDay.set(
        key,
        (expectedExpenseByDay.get(key) ?? 0) + Number(exp.amount ?? 0) * expenseMultiplier
      );
    }

    const series = [];
    let running = startingBalance;
    for (let d = new Date(from); d.getTime() <= to.getTime(); d = addDaysUTC(d, 1)) {
      const key = toUTCDateKey(d);
      const expectedIncomes = expectedIncomeByDay.get(key) ?? 0;
      const expectedExpenses = expectedExpenseByDay.get(key) ?? 0;
      running = running + expectedIncomes - expectedExpenses;
      series.push({
        date: key,
        expectedIncomes: Number(expectedIncomes.toFixed(2)),
        expectedExpenses: Number(expectedExpenses.toFixed(2)),
        projectedBalance: Number(running.toFixed(2)),
      });
    }

    return sendSuccess({
      from: toUTCDateKey(from),
      to: toUTCDateKey(to),
      startingBalance: Number(startingBalance.toFixed(2)),
      series,
      meta: {
        scenario,
        avgMonths,
        estimateMethod: "moving_average_monthly_sum",
        incomeMultiplier,
        expenseMultiplier,
        horizonDays,
        horizonMonths,
        from: toUTCDateKey(from),
        to: toUTCDateKey(to),
        includedIncomeStatuses: ["RECEIVED"],
        includedExpenseStatuses: ["PENDING", "SCHEDULED"],
        startingBalancePolicy: "incomes_before - expenses_before_not_paid",
        datePolicy: "date_only_utc_midnight",
      },
    });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível calcular a projeção", 500, error);
  }
}
