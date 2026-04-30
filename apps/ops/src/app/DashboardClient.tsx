"use client";

import { useCallback, useEffect, useState } from "react";
import { MetricsCard, MetricsSection } from "@devflow/ui";
import type { ProductMetrics } from "./actions";
import { getAggregatedMetrics } from "./actions";
import { Button } from "@/components/ui/button";

type Props = { initialData: ProductMetrics[] };

function formatMrr(cents: number | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function DashboardClient({ initialData }: Props) {
  const [data, setData] = useState<ProductMetrics[]>(initialData);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getAggregatedMetrics();
      setData(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(refresh, 60000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Ops Dashboard — DevFlow</h1>
        <Button
          variant="primary"
          type="button"
          onClick={refresh}
          disabled={loading}
          className="disabled:opacity-60"
        >
          {loading ? "Atualizando…" : "Atualizar"}
        </Button>
      </div>

      {data.length === 0 && (
        <p className="text-muted-foreground">
          Nenhum produto configurado. Defina OPS_FINANCEIRO_URL, OPS_INVESTIGAMAIS_URL e/ou
          OPS_WHATSAPP_URL apontando para GET /api/ops/metrics de cada app.
        </p>
      )}

      {data.map((row) => (
        <MetricsSection key={row.product} title={row.product} className="mt-10">
          {row.error ? (
            <MetricsCard label="Erro" value={row.error} />
          ) : (
            <>
              <MetricsCard label="Usuários" value={row.users ?? 0} />
              <MetricsCard label="Assinaturas ativas" value={row.activeSubscriptions ?? 0} />
              <MetricsCard label="Cancelamentos pendentes" value={row.pendingCancellation ?? 0} />
              <MetricsCard label="MRR" value={formatMrr(row.mrr)} />
              {row.tenants != null && (
                <MetricsCard label="Tenants" value={row.tenants} />
              )}
              {row.conversations != null && (
                <MetricsCard label="Conversas" value={row.conversations} />
              )}
              {row.messagesLast24h != null && (
                <MetricsCard label="Mensagens (24h)" value={row.messagesLast24h} />
              )}
              {row.queries != null && (
                <MetricsCard label="Consultas" value={row.queries} />
              )}
              {row.cacheHitRate != null && (
                <MetricsCard label="Cache hit rate (%)" value={row.cacheHitRate} />
              )}
            </>
          )}
        </MetricsSection>
      ))}
    </main>
  );
}
