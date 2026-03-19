/**
 * Tipos do módulo de analytics SaaS (receita e uso).
 */

export type PeriodKind = "7d" | "30d" | "custom";

export type DateRange = {
  from: Date;
  to: Date;
};

export type RevenueMetrics = {
  mrr: number;
  arr: number;
  arpu: number;
  churnRate: number;
  activeSubscriptions: number;
  canceledInPeriod: number;
  totalTenants: number;
};

export type UsageAggregateRow = {
  period: string;
  messagesCount: number;
  aiCount: number;
};

export type UsageMetrics = {
  totalMessages: number;
  totalAi: number;
  byPeriod: UsageAggregateRow[];
};

export type TenantRankingRow = {
  tenantId: string;
  tenantName: string | null;
  plan: string | null;
  messagesCount: number;
  aiCount: number;
  totalUsage: number;
  /** Receita estimada do tenant no período (baseada em plano + uso variável opcional) */
  estimatedRevenue?: number;
};
