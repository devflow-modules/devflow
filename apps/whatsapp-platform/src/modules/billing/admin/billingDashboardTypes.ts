/**
 * Tipos do dashboard admin de billing.
 */

export type BillingDashboardSummary = {
  totalMRR: number;
  totalARR: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  canceledSubscriptions: number;
  totalMessageOverage: number;
  totalAiOverage: number;
  totalOverageRevenue: number;
  failedInvoicesCount: number;
  blockedUsageEventsCount: number;
};

export type BillingTenantRow = {
  tenantId: string;
  tenantName: string | null;
  plan: string;
  subscriptionStatus: string;
  messagesUsed: number;
  messagesLimit: number | null;
  aiUsed: number;
  aiLimit: number | null;
  overageMessages: number;
  overageAi: number;
  lastInvoiceAmount: number | null;
  lastInvoiceStatus: string | null;
  updatedAt: string;
};

export type BillingCriticalEvent = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  eventType: string;
  source: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

export type BillingDashboardFilters = {
  plan?: string;
  subscriptionStatus?: string;
  eventType?: string;
  tenantId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type UsageByPlan = {
  plan: string;
  messages: number;
  ai: number;
};

export type RevenueByType = {
  type: "recorrente" | "overage_mensagens" | "overage_ia";
  value: number;
};
