"use client";

import { useCallback, useEffect, useState } from "react";
import { MetricsCard, MetricsSection, FunnelVisualization } from "@devflow/ui";
import type { AdminMetricsPayload } from "./actions";
import { getAdminMetrics } from "./actions";

const PREFIX = "whatsapp.";

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
      <div className="mb-8 flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">Métricas internas — WhatsApp Platform</h1>
        <div className="flex gap-2 items-center">
          <a
            href={exportConversationsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Exportar conversas (CSV)
          </a>
          <a
            href={exportMessagesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Exportar mensagens (CSV)
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

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Funil</h2>
        <div className="max-w-md">
          <FunnelVisualization steps={funnelSteps} />
        </div>
      </section>
    </main>
  );
}
