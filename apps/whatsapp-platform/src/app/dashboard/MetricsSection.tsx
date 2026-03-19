"use client";

import { useState, useEffect } from "react";

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

export function MetricsSection() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/metrics/overview").then((r) => {
        if (r.status === 401) return null;
        return r.ok ? r.json() : null;
      }),
      fetch("/api/metrics/agents").then((r) => {
        if (r.status === 401) return null;
        return r.ok ? r.json() : null;
      }),
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

  if (loading) return <p className="text-slate-600">Carregando métricas…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!overview && !stats && intents.length === 0 && agents.length === 0) return null;

  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-xl font-semibold">Métricas do tenant</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Total de mensagens</p>
          <p className="text-2xl font-semibold">{overview?.totalMessages ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Mensagens automáticas</p>
          <p className="text-2xl font-semibold">{overview?.automaticMessages ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Mensagens humanas</p>
          <p className="text-2xl font-semibold">{overview?.humanMessages ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Tempo médio resposta (ms)</p>
          <p className="text-2xl font-semibold">{overview?.avgResponseTimeMs ?? 0}</p>
        </div>
      </div>

      {stats && stats.messagesByDay.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-700 mb-2">Volume por dia</p>
          <div className="flex flex-wrap gap-2">
            {stats.messagesByDay.slice(-14).map(({ date, count }) => (
              <div key={date} className="flex items-baseline gap-1 rounded bg-slate-100 px-2 py-1 text-sm">
                <span className="text-slate-600">{date.slice(5)}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {intents.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-700 mb-2">Distribuição de intenções</p>
          <ul className="flex flex-wrap gap-2">
            {intents.map(({ intent, count }) => (
              <li key={intent} className="rounded bg-blue-50 px-2 py-1 text-sm">
                <span className="font-medium">{intent}</span>: {count}
              </li>
            ))}
          </ul>
        </div>
      )}

      {agents.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <p className="text-sm font-medium text-slate-700 p-4 pb-2">KPIs por agente</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left p-2">Agente</th>
                <th className="text-right p-2">Conversas</th>
                <th className="text-right p-2">Mensagens</th>
                <th className="text-right p-2">Tempo médio (ms)</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.agentId} className="border-b last:border-0">
                  <td className="p-2 font-mono">{a.agentId.slice(0, 8)}…</td>
                  <td className="text-right p-2">{a.conversationsCount}</td>
                  <td className="text-right p-2">{a.messagesCount}</td>
                  <td className="text-right p-2">{a.avgResponseTimeMs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
