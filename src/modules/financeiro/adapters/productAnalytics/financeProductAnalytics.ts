/**
 * Product Analytics do módulo financeiro.
 * Mede uso de ferramentas, features e funil de conversão.
 * Inicialmente: console + financeMetrics; preparado para PostHog, Amplitude, Mixpanel.
 */

import { increment } from "@/modules/financeiro/adapters/metrics/financeMetrics";
import { financeLogger } from "@/modules/financeiro/adapters/observability";

export type ProductAnalyticsContext = {
  userId?: string;
  householdId: string;
  timestamp?: string;
  traceId?: string;
};

const TOOL_METRIC: Record<string, string> = {
  expenses: "finance.tool.expenses.usage",
  incomes: "finance.tool.incomes.usage",
  rules: "finance.tool.rules.usage",
  cycles: "finance.tool.cycles.usage",
  "payment-days": "finance.tool.payment-days.usage",
  "allocation-goals": "finance.tool.allocation-goals.usage",
};

const FEATURE_METRIC: Record<string, string> = {
  "rules.create": "finance.feature.rules.created",
  "rules.update": "finance.feature.rules.updated",
  "household.invite": "finance.household.invites.sent",
  "household.transfer": "finance.household.transfer.usage",
  "household.member_removed": "finance.household.members.removed",
};

/** Em memória: chaves já emitidas para funil (householdId:eventName). Limitação: por processo. */
const funnelEmitted = new Set<string>();

function contextWithTimestamp(ctx: ProductAnalyticsContext): ProductAnalyticsContext & { timestamp: string } {
  return {
    ...ctx,
    timestamp: ctx.timestamp ?? new Date().toISOString(),
  };
}

/**
 * Registra uso de uma ferramenta (ex.: expenses, incomes, rules).
 * Incrementa métrica finance.tool.<toolName>.usage e opcionalmente loga.
 */
export function trackToolUsage(
  toolName: string,
  context: ProductAnalyticsContext
): void {
  const ctx = contextWithTimestamp(context);
  const metric = TOOL_METRIC[toolName] ?? `finance.tool.${toolName}.usage`;
  increment(metric);
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    financeLogger.info("product_analytics.tool_usage", {
      toolName,
      ...ctx,
      metric,
    });
  }
}

/**
 * Registra uso de uma feature (ex.: rules.create, household.invite).
 * Incrementa métrica correspondente e opcionalmente loga.
 */
export function trackFeatureUsage(
  featureName: string,
  context: ProductAnalyticsContext
): void {
  const ctx = contextWithTimestamp(context);
  const metric = FEATURE_METRIC[featureName] ?? `finance.feature.${featureName.replace(".", "_")}.usage`;
  increment(metric);
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    financeLogger.info("product_analytics.feature_usage", {
      featureName,
      ...ctx,
      metric,
    });
  }
}

/**
 * Registra evento de conversão (ex.: funnel step).
 * Incrementa métrica finance.conversion.<eventName> e loga.
 */
export function trackConversion(
  eventName: string,
  context: ProductAnalyticsContext
): void {
  const ctx = contextWithTimestamp(context);
  const metric = `finance.conversion.${eventName.replace(/\./g, "_")}`;
  increment(metric);
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    financeLogger.info("product_analytics.conversion", { eventName, ...ctx, metric });
  }
}

export type FunnelEventName =
  | "finance.funnel.household.created"
  | "finance.funnel.first_expense_created"
  | "finance.funnel.first_income_created"
  | "finance.funnel.first_rule_created"
  | "finance.funnel.first_cycle_configured";

/**
 * Emite evento de funil apenas na primeira ocorrência (por household + evento, em memória).
 * Limitação: por processo; após restart pode emitir novamente.
 */
export function trackFunnelFirst(
  eventName: FunnelEventName,
  context: ProductAnalyticsContext
): boolean {
  const key = `${context.householdId}:${eventName}`;
  if (funnelEmitted.has(key)) return false;
  funnelEmitted.add(key);
  trackConversion(eventName, context);
  return true;
}

/** Reseta estado de funil emitido (apenas para testes). */
export function resetFunnelState(): void {
  funnelEmitted.clear();
}
