"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { StateEmpty, StateError, StateLoading } from "@/components/ui/app-states";
import { fetchProtected } from "@/lib/protected-fetch";
import { fetchInboxOperationalQueues } from "@/components/inbox/inboxFetch";
import type { ManagerDashboardPayload } from "@/modules/metrics/managerDashboardService";

function formatMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = Math.round(ms / 1000);
  if (s < 120) return `${s}s`;
  const m = Math.round(ms / 60000);
  if (m < 120) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest > 0 ? `${h}h ${rest}m` : `${h}h`;
}

function formatPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n * 1000) / 10}%`;
}

const FUNNEL_LABELS: Record<keyof ManagerDashboardPayload["funnel"], string> = {
  lead: "Lead",
  qualified: "Qualificado",
  proposal: "Proposta",
  followUp: "Follow-up",
  closed: "Fechado",
  lost: "Perdido",
};

export function ManagerDashboardSection() {
  const [data, setData] = useState<ManagerDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [queues, setQueues] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchInboxOperationalQueues()
      .then((list) => {
        if (!cancelled) setQueues(list.map((q) => ({ id: q.id, name: q.name })));
      })
      .catch(() => {
        if (!cancelled) setQueues([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (queueId && queueId !== "all") {
      params.set("queueId", queueId);
    }
    const url =
      params.toString().length > 0
        ? `/api/metrics/manager-dashboard?${params.toString()}`
        : "/api/metrics/manager-dashboard";
    fetchProtected(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: ManagerDashboardPayload | null) => {
        if (!cancelled && json) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError("Erro ao carregar dashboard gerencial");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queueId]);

  if (loading) {
    return (
      <div data-testid="manager-dashboard-loading">
        <StateLoading message="A carregar visão gerencial…" className="min-h-[10rem] border-slate-200/80 bg-white/90 py-10 shadow-none" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <StateError
        title="Dashboard gerencial indisponível"
        message={error ?? "Sem dados."}
        onRetry={() => window.location.reload()}
        className="text-left"
      />
    );
  }

  const rangeLabel =
    data.range.dateFrom && data.range.dateTo
      ? `${new Date(data.range.dateFrom).toLocaleDateString("pt-PT")} — ${new Date(data.range.dateTo).toLocaleDateString("pt-PT")}`
      : "Período";

  const funnelTotal = Object.values(data.funnel).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8" data-testid="manager-dashboard">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Visão gerencial</h2>
          <p className="mt-1 text-sm text-slate-500">
            Operação em tempo real; restantes métricas no período: <span className="font-medium text-slate-700">{rangeLabel}</span>
          </p>
        </div>
        {queues.length > 0 ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="manager-dash-queue" className="text-[11px] font-medium text-slate-500">
              Fila
            </label>
            <select
              id="manager-dash-queue"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              value={queueId === null ? "all" : queueId}
              onChange={(e) => {
                const v = e.target.value;
                setLoading(true);
                setError(null);
                setQueueId(v === "all" ? null : v);
              }}
            >
              <option value="all">Todas as filas</option>
              <option value="none">Sem fila</option>
              {queues.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="md" className="!p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">A responder</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{data.operation.awaiting}</p>
          <p className="mt-1 text-xs text-slate-500">Threads com mensagem pendente</p>
        </Card>
        <Card padding="md" className="!p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sem dono</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{data.operation.unassigned}</p>
          <p className="mt-1 text-xs text-slate-500">Abertas sem atribuição</p>
        </Card>
        <Card padding="md" className="!p-5 ring-1 ring-rose-200/80 bg-gradient-to-br from-rose-50/80 to-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-800/90">SLA crítico</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-rose-950">{data.operation.critical}</p>
          <p className="mt-1 text-xs text-rose-900/80">Aguardam há ≥ 30 min</p>
        </Card>
        <Card padding="md" className="!p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">1.ª resposta (média)</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{formatMs(data.operation.avgFirstResponseMs)}</p>
          <p className="mt-1 text-xs text-slate-500">No período (cliente → 1.ª resposta)</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Equipa" description="Atividade e fechos no período." />
          <div className="grid gap-3 px-6 pb-4 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Threads atendidas</p>
              <p className="text-xl font-bold tabular-nums text-slate-900">{data.team.handled}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Resposta média</p>
              <p className="text-xl font-bold tabular-nums text-slate-900">{formatMs(data.team.avgResponseMs)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-slate-500">1.ª resposta</p>
              <p className="text-xl font-bold tabular-nums text-slate-900">{formatMs(data.team.avgFirstResponseMs)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Fechadas</p>
              <p className="text-xl font-bold tabular-nums text-slate-900">{data.team.closed}</p>
            </div>
          </div>
          {data.team.agents.length === 0 ? (
            <div className="px-6 pb-6">
              <StateEmpty
                title="Sem utilizadores na conta"
                description="Convide agentes em Configurações para ver desempenho por pessoa."
                className="border-dashed border-slate-200 bg-slate-50/50 py-8"
              />
            </div>
          ) : (
            <div className="overflow-x-auto px-2 pb-6">
              <table className="w-full min-w-[520px] text-sm" data-testid="manager-dashboard-agents-table">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2">Agente</th>
                    <th className="px-4 py-2 text-right">Threads</th>
                    <th className="px-4 py-2 text-right">Resposta</th>
                    <th className="px-4 py-2 text-right">1.ª resposta</th>
                    <th className="px-4 py-2 text-right">Fechadas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.team.agents.map((a) => (
                    <tr key={a.userId} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {a.name ?? a.email ?? a.userId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-800">{a.handled}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatMs(a.avgResponseMs)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatMs(a.avgFirstResponseMs)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-800">{a.closed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Automação & IA" description="Proporções no período (mensagens e auditoria)." />
          <ul className="space-y-2 px-6 pb-6 text-sm" data-testid="manager-dashboard-automation">
            <li className="flex justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-600">Mensagens automáticas / IA</span>
              <span className="font-semibold tabular-nums text-slate-900">{formatPct(data.automation.autoRate)}</span>
            </li>
            <li className="flex justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-600">Mensagens IA vs fechos no período</span>
              <span className="font-semibold tabular-nums text-slate-900">{formatPct(data.automation.resolvedByAiRate)}</span>
            </li>
            <li className="flex justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-600">Transbordo humano (agente / agente+IA)</span>
              <span className="font-semibold tabular-nums text-slate-900">{formatPct(data.automation.fallbackRate)}</span>
            </li>
            <li className="flex justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-600">Uso de playbook (vs threads ativas)</span>
              <span className="font-semibold tabular-nums text-slate-900">{formatPct(data.automation.playbookUsageRate)}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-slate-600">Follow-up sugerido</span>
              <span className="font-semibold tabular-nums text-slate-900">{formatPct(data.automation.followUpUsageRate)}</span>
            </li>
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Funil (tags)"
          description="Distribuição atual por tags de funil (Lead → … → Perdido). Crie tags com nomes como «Lead» ou «Proposta»."
        />
        {funnelTotal === 0 ? (
          <div className="px-6 pb-8">
            <div data-testid="manager-dashboard-funnel-empty">
              <StateEmpty
                title="Sem tags de funil"
                description="Ao classificar conversas com tags alinhadas ao funil, o resumo aparece aqui."
                className="border-dashed border-slate-200 bg-slate-50/50 py-8"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 px-6 pb-8 sm:grid-cols-2 lg:grid-cols-3" data-testid="manager-dashboard-funnel">
            {(Object.keys(data.funnel) as (keyof ManagerDashboardPayload["funnel"])[]).map((key) => {
              const v = data.funnel[key];
              const pct = funnelTotal > 0 ? Math.round((v / funnelTotal) * 100) : 0;
              return (
                <div
                  key={key}
                  className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{FUNNEL_LABELS[key]}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{v}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className="h-full rounded-full bg-[var(--df-brand-600)] transition-[width] duration-500 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{pct}% do funil etiquetado</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
