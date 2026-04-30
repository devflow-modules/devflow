"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MetricsCard, MetricsSection, FunnelVisualization } from "@devflow/ui";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import type {
  AdminMetricsPayload,
  AdminRevenuePayload,
  AdminUsagePayload,
  AdminTenantsPayload,
} from "./actions";
import {
  getAdminMetrics,
  getAdminRevenue,
  getAdminUsage,
  getAdminTenants,
} from "./actions";

const PREFIX = "whatsapp.";
type Period = "7d" | "30d";

function get(metrics: Record<string, number>, key: string): number {
  return metrics[key] ?? 0;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number): string {
  return `${Number(value).toFixed(1)}%`;
}

type Props = { initialData: AdminMetricsPayload };

export function MetricsDashboardClient({ initialData }: Props) {
  const [data, setData] = useState<AdminMetricsPayload>(initialData);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>("30d");
  const [revenue, setRevenue] = useState<AdminRevenuePayload | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [usage, setUsage] = useState<AdminUsagePayload | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [tenantsData, setTenantsData] = useState<AdminTenantsPayload | null>(null);
  const [tenantsLoading, setTenantsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getAdminMetrics();
      setData(next);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSaaSMetrics = useCallback(async () => {
    setRevenueLoading(true);
    setUsageLoading(true);
    setTenantsLoading(true);
    try {
      const [rev, use, ten] = await Promise.all([
        getAdminRevenue(),
        getAdminUsage(period),
        getAdminTenants(period, 10),
      ]);
      setRevenue(rev);
      setUsage(use);
      setTenantsData(ten);
    } finally {
      setRevenueLoading(false);
      setUsageLoading(false);
      setTenantsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    loadSaaSMetrics();
  }, [loadSaaSMetrics]);

  const m = data.whatsapp_platform.metrics;
  const { tenants, conversations, messagesLast24h } = data.ops;

  const funnelSteps = [
    { label: "Webhook recebido", value: get(m, PREFIX + "webhook_received"), key: "webhook" },
    { label: "Mensagem recebida", value: get(m, PREFIX + "inbound_message_received"), key: "inbound" },
    { label: "Conversa iniciada", value: get(m, PREFIX + "conversation_started"), key: "started" },
    { label: "Resposta IA", value: get(m, PREFIX + "ai_response_generated"), key: "ai" },
    { label: "Mensagem enviada", value: get(m, PREFIX + "message_sent"), key: "sent" },
    { label: "Conversa encerrada", value: get(m, PREFIX + "conversation_closed"), key: "closed" },
  ];

  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const exportConversationsUrl = `/api/admin/export/conversations?from=${from}&to=${to}`;
  const exportMessagesUrl = `/api/admin/export/messages?from=${from}&to=${to}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        eyebrow="Plataforma interna"
        title="Métricas internas"
        description="Eventos agregados do produto, operações em tempo real e indicadores SaaS. Uso exclusivo da equipa DevFlow — não confundir com métricas do tenant cliente."
        layout="split"
        showDivider
        tone="admin"
        className="mb-8 !pb-6 sm:!pb-8"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <a
              href="/admin/billing"
              className="rounded-lg border df-border-dark px-3 py-2 text-sm font-medium df-text-secondary hover:bg-muted/60"
            >
              Faturação e receita
            </a>
            <a
              href={exportConversationsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border df-border-dark px-3 py-2 text-sm font-medium df-text-secondary hover:bg-muted/60"
            >
              Exportar conversas (CSV)
            </a>
            <a
              href={exportMessagesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border df-border-dark px-3 py-2 text-sm font-medium df-text-secondary hover:bg-muted/60"
            >
              Exportar mensagens (CSV)
            </a>
            <Button variant="disabled"
              type="button"
              onClick={refresh}
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Atualizando…" : "Atualizar"}
            </Button>
          </div>
        }
      />

      <MetricsSection title="Métricas do produto">
        <MetricsCard label="Tenant criado" value={get(m, PREFIX + "tenant_created")} />
        <MetricsCard label="Conversa iniciada" value={get(m, PREFIX + "conversation_started")} />
        <MetricsCard label="Conversa encerrada" value={get(m, PREFIX + "conversation_closed")} />
        <MetricsCard label="Resposta IA gerada" value={get(m, PREFIX + "ai_response_generated")} />
        <MetricsCard label="Mensagem enviada" value={get(m, PREFIX + "message_sent")} />
        <MetricsCard label="Falha ao enviar" value={get(m, PREFIX + "message_send_failed")} />
        <MetricsCard label="Mensagem recebida" value={get(m, PREFIX + "inbound_message_received")} />
        <MetricsCard label="Webhook recebido" value={get(m, PREFIX + "webhook_received")} />
      </MetricsSection>

      <MetricsSection title="Ops" className="mt-10">
        <MetricsCard label="Tenants" value={tenants} />
        <MetricsCard label="Conversas" value={conversations} />
        <MetricsCard label="Mensagens (24h)" value={messagesLast24h} />
      </MetricsSection>

      <MetricsSection title="Receita SaaS" className="mt-10">
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <span className="text-sm text-muted-foreground">Período (uso/ranking):</span>
          <Button variant="secondary"
            type="button"
            onClick={() => setPeriod("7d")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${period === "7d" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-muted"}`}
          >
            7 dias
          </Button>
          <Button variant="secondary"
            type="button"
            onClick={() => setPeriod("30d")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${period === "30d" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-muted"}`}
          >
            30 dias
          </Button>
        </div>
        {revenueLoading ? (
          <p className="text-sm text-muted-foreground">Carregando receita…</p>
        ) : revenue ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricsCard label="MRR" value={formatBRL(revenue.mrr)} />
            <MetricsCard label="ARR" value={formatBRL(revenue.arr)} />
            <MetricsCard label="ARPU" value={formatBRL(revenue.arpu)} />
            <MetricsCard label="Churn" value={formatPct(revenue.churnRate)} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem dados de receita</p>
        )}
      </MetricsSection>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Uso no período</h2>
        {usageLoading ? (
          <p className="text-sm text-muted-foreground">Carregando uso…</p>
        ) : usage && (usage.totalMessages > 0 || usage.totalAi > 0) ? (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <MetricsCard label="Mensagens" value={usage.totalMessages} />
              <MetricsCard label="Respostas IA" value={usage.totalAi} />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Mensagens", value: usage.totalMessages, fill: "hsl(var(--primary))" },
                    { name: "Respostas IA", value: usage.totalAi, fill: "hsl(var(--chart-2))" },
                  ]}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR")} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[
                      { fill: "hsl(var(--primary))" },
                      { fill: "hsl(142 76% 36%)" },
                    ].map((c, i) => (
                      <Cell key={i} fill={c.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground rounded-xl border border-border bg-card p-4">
            Nenhum uso registrado no período.
          </p>
        )}
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Top tenants por uso</h2>
        {tenantsLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : tenantsData && tenantsData.tenants.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium">Tenant</th>
                  <th className="text-left p-3 font-medium">Plano</th>
                  <th className="text-right p-3 font-medium">Mensagens</th>
                  <th className="text-right p-3 font-medium">IA</th>
                  <th className="text-right p-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {tenantsData.tenants.map((row) => (
                  <tr key={row.tenantId} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3">{row.tenantName || row.tenantId.slice(0, 12)}</td>
                    <td className="p-3">{row.plan ?? "—"}</td>
                    <td className="p-3 text-right tabular-nums">{row.messagesCount.toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-right tabular-nums">{row.aiCount.toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-right tabular-nums font-medium">{row.totalUsage.toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground rounded-xl border border-border bg-card p-4">
            Nenhum tenant com uso no período.
          </p>
        )}
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Funil</h2>
        <div className="max-w-md">
          <FunnelVisualization steps={funnelSteps} />
        </div>
      </section>
    </main>
  );
}
