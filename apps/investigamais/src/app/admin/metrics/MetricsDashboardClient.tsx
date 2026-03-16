"use client";

import { useCallback, useEffect, useState } from "react";
import { MetricsCard, MetricsSection, FunnelVisualization } from "@devflow/ui";
import type { AdminMetricsPayload } from "./actions";
import { getAdminMetrics } from "./actions";

const PREFIX = "investiga.";

function get(metrics: Record<string, number>, key: string): number {
  return metrics[key] ?? 0;
}

type Props = { initialData: AdminMetricsPayload };

export function MetricsDashboardClient({ initialData }: Props) {
  const [data, setData] = useState<AdminMetricsPayload>(initialData);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getAdminMetrics();
      setData(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const m = data.investigamais.metrics;
  const { users, queries, cacheHitRate } = data.ops;

  const queryRequested = get(m, PREFIX + "cnpj_query_requested");
  const cacheHit = get(m, PREFIX + "cnpj_cache_hit");
  const cacheMiss = get(m, PREFIX + "cnpj_cache_miss");
  const queryCompleted = get(m, PREFIX + "cnpj_query_completed");
  const userLogin = get(m, PREFIX + "user_login");
  const userLogout = get(m, PREFIX + "user_logout");
  const historyViewed = get(m, PREFIX + "history_viewed");
  const profileUpdated = get(m, PREFIX + "profile_updated");
  const webhookReceived = get(m, PREFIX + "webhook_received");
  const webhookUserCreated = get(m, PREFIX + "webhook_user_created");

  const funnelSteps = [
    { label: "Consultas solicitadas", value: queryRequested, key: "requested" },
    { label: "Cache hit", value: cacheHit, key: "cache_hit" },
    { label: "Cache miss", value: cacheMiss, key: "cache_miss" },
    { label: "Consultas concluídas", value: queryCompleted, key: "completed" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Métricas internas — Investiga+</h1>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
      </div>

      <MetricsSection title="Métricas do produto">
        <MetricsCard label="Consultas solicitadas" value={queryRequested} />
        <MetricsCard label="Cache hit" value={cacheHit} />
        <MetricsCard label="Cache miss" value={cacheMiss} />
        <MetricsCard label="Consultas concluídas" value={queryCompleted} />
        <MetricsCard label="Login" value={userLogin} />
        <MetricsCard label="Logout" value={userLogout} />
        <MetricsCard label="Histórico visualizado" value={historyViewed} />
        <MetricsCard label="Perfil atualizado" value={profileUpdated} />
        <MetricsCard label="Webhook recebido" value={webhookReceived} />
        <MetricsCard label="Usuário criado (webhook)" value={webhookUserCreated} />
      </MetricsSection>

      <MetricsSection title="Ops" className="mt-10">
        <MetricsCard label="Usuários" value={users} />
        <MetricsCard label="Consultas" value={queries} />
        <MetricsCard label="Taxa de cache (%)" value={cacheHitRate} />
      </MetricsSection>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Funil consultas</h2>
        <div className="max-w-md">
          <FunnelVisualization steps={funnelSteps} />
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Conversões</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricsCard
            label="Cache hit rate"
            value={typeof cacheHitRate === "number" ? `${cacheHitRate}%` : cacheHitRate}
          />
          <MetricsCard
            label="Consultas / usuário"
            value={users > 0 ? (queries / users).toFixed(1) : "—"}
          />
        </div>
      </section>
    </main>
  );
}
