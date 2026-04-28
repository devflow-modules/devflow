"use client";

import { useState, useEffect } from "react";
import { StateEmpty, StateError, StateLoading } from "@/components/ui/app-states";
import { fetchProtected } from "@/lib/protected-fetch";

type Overview = {
  totalMessages: number;
  automaticMessages: number;
  humanMessages: number;
  avgResponseTimeMs: number;
};

type Stats = {
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
  messagesByDay: { date: string; count: number }[];
};

type Intent = { intent: string; count: number };

type AgentRow = { agentId: string; conversationsCount: number; avgResponseTimeMs: number; messagesCount: number };

export function MetricsSection({ compact = false }: { compact?: boolean }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchProtected("/api/metrics/overview").then((r) => (r.ok ? r.json() : null)),
      fetchProtected("/api/metrics/agents").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([overviewData, agentsData]) => {
        if (overviewData?.overview) setOverview(overviewData.overview);
        if (overviewData?.stats) setStats(overviewData.stats);
        if (overviewData?.intents) setIntents(overviewData.intents);
        if (agentsData?.byAgent) setAgents(agentsData.byAgent);
      })
      .catch(() => setError("Erro ao carregar métricas"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <StateLoading
        message="A carregar métricas…"
        className={compact ? "min-h-[8rem] border-0 bg-transparent py-8 shadow-none" : ""}
      />
    );
  }
  if (error) {
    return (
      <StateError
        title="Métricas indisponíveis"
        message={error}
        onRetry={() => window.location.reload()}
        className="text-left"
      />
    );
  }

  const hasDetail =
    (stats?.messagesByDay?.length ?? 0) > 0 || intents.length > 0 || agents.length > 0;
  const hasAny = overview !== null || stats !== null || intents.length > 0 || agents.length > 0;

  if (compact && !hasAny) {
    return (
      <StateEmpty
        title="Sem histórico detalhado ainda"
        description="Quando houver mais mensagens, aparecem aqui volume por dia, intenções e desempenho por agente."
        nextStep="Envie mensagens de teste a partir do WhatsApp Business ou aguarde tráfego real; o resumo preenche automaticamente."
        className="border-slate-200/80 bg-slate-50/50 py-8"
      />
    );
  }

  if (!compact && !hasAny) {
    return null;
  }

  return (
    <div className={compact ? "space-y-4" : "mt-8 space-y-6"}>
      {!compact && (
        <>
          <h2 className="text-xl font-semibold text-[var(--df-text-primary)]">Métricas do tenant</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="df-surface rounded-lg p-4">
              <p className="text-sm text-[var(--df-text-secondary)]">Total de mensagens</p>
              <p className="text-2xl font-semibold tabular-nums">{overview?.totalMessages ?? 0}</p>
            </div>
            <div className="df-surface rounded-lg p-4">
              <p className="text-sm text-[var(--df-text-secondary)]">Mensagens automáticas</p>
              <p className="text-2xl font-semibold tabular-nums">{overview?.automaticMessages ?? 0}</p>
            </div>
            <div className="df-surface rounded-lg p-4">
              <p className="text-sm text-[var(--df-text-secondary)]">Mensagens humanas</p>
              <p className="text-2xl font-semibold tabular-nums">{overview?.humanMessages ?? 0}</p>
            </div>
            <div className="df-surface rounded-lg p-4">
              <p className="text-sm text-[var(--df-text-secondary)]">Tempo médio resposta (ms)</p>
              <p className="text-2xl font-semibold tabular-nums">{overview?.avgResponseTimeMs ?? 0}</p>
            </div>
          </div>
        </>
      )}

      {compact && !hasDetail && overview && (
        <p className="text-sm text-[var(--df-text-secondary)]">
          Volume por dia e breakdowns aparecem quando houver mais conversas.
        </p>
      )}

      {stats && stats.messagesByDay.length > 0 && (
        <div className="df-surface rounded-lg p-4">
          <p className="mb-2 text-sm font-medium text-[var(--df-text-secondary)]">Volume por dia</p>
          <div className="flex flex-wrap gap-2">
            {stats.messagesByDay.slice(-14).map(({ date, count }) => (
              <div key={date} className="flex items-baseline gap-1 rounded-md bg-[var(--df-bg-app)] px-2 py-1 text-sm shadow-sm">
                <span className="text-[var(--df-text-secondary)]">{date.slice(5)}</span>
                <span className="font-medium tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {intents.length > 0 && (
        <div className="df-surface rounded-lg p-4">
          <p className="mb-2 text-sm font-medium text-[var(--df-text-secondary)]">Distribuição de intenções</p>
          <ul className="flex flex-wrap gap-2">
            {intents.map(({ intent, count }) => (
              <li key={intent} className="rounded-md bg-[var(--df-bg-app)] px-2 py-1 text-sm shadow-sm">
                <span className="font-medium">{intent}</span>: {count}
              </li>
            ))}
          </ul>
        </div>
      )}

      {agents.length > 0 && (
        <div className="overflow-hidden rounded-lg border df-border-brand">
          <p className="border-b df-border-brand bg-[var(--df-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--df-text-secondary)]">
            Por agente
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b df-border-brand bg-[var(--df-bg-elevated)]">
                <th className="p-3 text-left font-medium text-[var(--df-text-secondary)]">Agente</th>
                <th className="p-3 text-right font-medium text-[var(--df-text-secondary)]">Conversas</th>
                <th className="p-3 text-right font-medium text-[var(--df-text-secondary)]">Mensagens</th>
                <th className="p-3 text-right font-medium text-[var(--df-text-secondary)]">Tempo (ms)</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.agentId} className="border-b df-border-brand last:border-0">
                  <td className="p-3 font-mono text-xs text-[var(--df-text-primary)]">{a.agentId.slice(0, 8)}…</td>
                  <td className="p-3 text-right tabular-nums">{a.conversationsCount}</td>
                  <td className="p-3 text-right tabular-nums">{a.messagesCount}</td>
                  <td className="p-3 text-right tabular-nums">{a.avgResponseTimeMs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
