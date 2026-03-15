export type Scenario = "BASE" | "PESSIMISTIC" | "OPTIMISTIC";

export function getScenarioMultipliers(scenario: Scenario) {
  const incomeMultiplier = scenario === "PESSIMISTIC" ? 0.9 : scenario === "OPTIMISTIC" ? 1.1 : 1;
  const expenseMultiplier = scenario === "PESSIMISTIC" ? 1.1 : scenario === "OPTIMISTIC" ? 0.9 : 1;
  return { incomeMultiplier, expenseMultiplier };
}

export function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addMonths(date: Date, delta: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

export function toMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildTrailingMonthKeys(from: Date, avgMonths: number) {
  const keys: string[] = [];
  for (let i = avgMonths; i >= 1; i--) {
    keys.push(toMonthKey(addMonths(from, -i)));
  }
  return keys;
}

export type IncomeRow = { sourceId: string | null; amount: number; receivedAt: Date };

/**
 * Calcula a média móvel (soma mensal / N meses), preenchendo meses sem receita com 0.
 */
export function computeMonthlyAverageBySource(args: {
  incomes: IncomeRow[];
  activeSourceIds: Set<string>;
  from: Date;
  avgMonths: number;
}) {
  const { incomes, activeSourceIds, from, avgMonths } = args;
  const monthKeys = buildTrailingMonthKeys(from, avgMonths);

  const monthlySumsBySource = new Map<string, Map<string, number>>();
  for (const row of incomes) {
    const sourceId = row.sourceId ?? "";
    if (!sourceId || !activeSourceIds.has(sourceId)) continue;
    const monthKey = toMonthKey(row.receivedAt);
    const byMonth = monthlySumsBySource.get(sourceId) ?? new Map<string, number>();
    byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + Number(row.amount ?? 0));
    monthlySumsBySource.set(sourceId, byMonth);
  }

  const estimateBySource = new Map<string, number>();
  for (const sourceId of activeSourceIds) {
    const byMonth = monthlySumsBySource.get(sourceId) ?? new Map<string, number>();
    const sum = monthKeys.reduce((acc, key) => acc + (byMonth.get(key) ?? 0), 0);
    const avg = sum / avgMonths;
    if (avg > 0) estimateBySource.set(sourceId, avg);
  }

  return { estimateBySource, monthKeys };
}
