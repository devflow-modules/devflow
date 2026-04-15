"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BillingSummaryCards,
  BillingTenantsTable,
  BillingCriticalEvents,
  BillingUsageByPlanCharts,
  BillingRevenueByTypeChart,
} from "@/components/admin/billing";
import type { BillingDashboardPayload } from "./actions";
import { getBillingDashboard } from "./actions";
import type { BillingTenantRow } from "@/modules/billing/admin/billingDashboardTypes";

type Props = { initialData: BillingDashboardPayload };

export function BillingDashboardClient({ initialData }: Props) {
  const [data, setData] = useState<BillingDashboardPayload>(initialData);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    plan: "",
    subscriptionStatus: "",
    eventType: "",
  });
  const [sortBy, setSortBy] = useState<keyof BillingTenantRow>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getBillingDashboard(
        {
          plan: filters.plan || undefined,
          subscriptionStatus: filters.subscriptionStatus || undefined,
          eventType: filters.eventType || undefined,
        },
        sortBy,
        sortOrder
      );
      setData(next);
    } finally {
      setLoading(false);
    }
  }, [filters.plan, filters.subscriptionStatus, filters.eventType, sortBy, sortOrder]);

  useEffect(() => {
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleSort = useCallback((by: keyof BillingTenantRow, order: "asc" | "desc") => {
    setSortBy(by);
    setSortOrder(order);
  }, []);

  useEffect(() => {
    if (sortBy || sortOrder) {
      refresh();
    }
  }, [sortBy, sortOrder, refresh]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">
          Billing e receita — Admin
        </h1>
        <div className="flex gap-2 items-center">
          <a
            href="/admin/metrics"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Métricas
          </a>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Atualizando…" : "Atualizar"}
          </button>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-4">Resumo</h2>
        <BillingSummaryCards summary={data.summary} />
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Gráficos de uso e receita
        </h2>
        <div className="space-y-6">
          <BillingUsageByPlanCharts usageByPlan={data.usageByPlan} />
          <BillingRevenueByTypeChart revenueByType={data.revenueByType} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-4">Filtros</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <select
            value={filters.plan}
            onChange={(e) => setFilters((f) => ({ ...f, plan: e.target.value }))}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">Todos os planos</option>
            <option value="FREE">FREE</option>
            <option value="STARTER">STARTER</option>
            <option value="PRO">PRO</option>
            <option value="SCALE">SCALE</option>
          </select>
          <select
            value={filters.subscriptionStatus}
            onChange={(e) =>
              setFilters((f) => ({ ...f, subscriptionStatus: e.target.value }))
            }
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">Todos os status</option>
            <option value="active">active</option>
            <option value="past_due">past_due</option>
            <option value="canceled">canceled</option>
            <option value="trialing">trialing</option>
          </select>
          <select
            value={filters.eventType}
            onChange={(e) =>
              setFilters((f) => ({ ...f, eventType: e.target.value }))
            }
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">Todos os eventos</option>
            <option value="invoice.payment_failed">Falha pagamento</option>
            <option value="usage.limit_exceeded">Limite excedido</option>
            <option value="system.error">Erro sistema</option>
            <option value="usage.threshold_warning">Uso ≥80%</option>
          </select>
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Aplicar filtros
          </button>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Tenants e billing
        </h2>
        <BillingTenantsTable
          tenants={data.tenants}
          onSort={handleSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Eventos críticos
        </h2>
        <BillingCriticalEvents events={data.criticalEvents} />
      </section>
    </main>
  );
}
