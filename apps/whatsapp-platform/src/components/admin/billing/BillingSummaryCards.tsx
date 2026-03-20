"use client";

import { MetricsCard } from "@devflow/ui";
import type { BillingDashboardSummary } from "@/modules/billing/admin/billingDashboardTypes";

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

type Props = { summary: BillingDashboardSummary };

export function BillingSummaryCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <MetricsCard label="MRR total" value={formatBRL(summary.totalMRR)} />
      <MetricsCard label="ARR total" value={formatBRL(summary.totalARR)} />
      <MetricsCard label="Tenants ativos" value={summary.activeSubscriptions} />
      <MetricsCard label="Tenants past_due" value={summary.pastDueSubscriptions} />
      <MetricsCard label="Tenants cancelados" value={summary.canceledSubscriptions} />
      <MetricsCard
        label="Overage período"
        value={formatBRL(summary.totalOverageRevenue)}
      />
    </div>
  );
}
