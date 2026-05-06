"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { StateEmpty, StateError, StateLoading } from "@/components/ui/app-states";
import { fetchProtected } from "@/lib/protected-fetch";
import {
  fetchInboxOperationalQueues,
  fetchTenantWhatsappLines,
} from "@/components/inbox/inboxFetch";
import { formatWhatsappLineFilterOptionLabel } from "@/lib/whatsapp-lines/linePresentation";
import type { ManagerDashboardPayload } from "@/modules/metrics/managerDashboardService";
import type { WhatsappLineSummary } from "@/components/inbox/inboxTypes";

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
  const [businessPhoneNumberId, setBusinessPhoneNumberId] = useState<string | null>(null);
  const [queues, setQueues] = useState<{ id: string; name: string }[]>([]);
  const [lines, setLines] = useState<WhatsappLineSummary[]>([]);

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
    fetchTenantWhatsappLines()
      .then((list) => {
        if (cancelled) return;
        setLines(list);
        if (list.length <= 1) {
          setBusinessPhoneNumberId(null);
        } else if (
          businessPhoneNumberId &&
          !list.some((line) => line.phoneNumberId === businessPhoneNumberId)
        ) {
          setBusinessPhoneNumberId(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLines([]);
          setBusinessPhoneNumberId(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [businessPhoneNumberId]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (queueId && queueId !== "all") {
      params.set("queueId", queueId);
    }
    if (businessPhoneNumberId && businessPhoneNumberId !== "all") {
      params.set("businessPhoneNumberId", businessPhoneNumberId);
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
  }, [queueId, businessPhoneNumberId]);

  if (loading) {
    return (
      <div data-testid="manager-dashboard-loading">
        <StateLoading message="A carregar visão gerencial…" className="min-h-[10rem] border-0 bg-transparent py-10 shadow-none" />
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
          <h2 className="df-text-section-title">Visão gerencial</h2>
          <p className="df-text-muted mt-1">
            Operação em tempo real; restantes métricas no período: <span className="font-medium text-[var(--df-text-primary)]">{rangeLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {lines.length > 1 ? (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="manager-dash-line"
                className="text-[11px] font-medium text-[var(--df-text-muted)]"
              >
                Linha WhatsApp
              </label>
              <select
                id="manager-dash-line"
                data-testid="manager-dash-line"
                className="rounded-lg border df-border-brand bg-[var(--df-bg-elevated)] px-3 py-2 text-sm text-[var(--df-text-primary)]"
                value={businessPhoneNumberId === null ? "all" : businessPhoneNumberId}
                onChange={(e) => {
                  const v = e.target.value;
                  setLoading(true);
                  setError(null);
                  setBusinessPhoneNumberId(v === "all" ? null : v);
                }}
              >
                <option value="all">Todas as linhas</option>
                {lines.map((line) => (
                  <option key={line.phoneNumberId} value={line.phoneNumberId}>
                    {formatWhatsappLineFilterOptionLabel(line)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {queues.length > 0 ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="manager-dash-queue" className="text-[11px] font-medium text-[var(--df-text-muted)]">
                Fila
              </label>
              <select
                id="manager-dash-queue"
                className="rounded-lg border df-border-brand bg-[var(--df-bg-elevated)] px-3 py-2 text-sm text-[var(--df-text-primary)]"
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="md" className="!p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--df-text-secondary)]">A responder</p>
          <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-[var(--df-text-primary)]">{data.operation.awaiting}</p>
          <p className="mt-1 text-xs text-[var(--df-text-secondary)]">Threads com mensagem pendente</p>
        </Card>
        <Card padding="md" className="!p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--df-text-secondary)]">Sem responsável</p>
          <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-[var(--df-text-primary)]">{data.operation.unassigned}</p>
          <p className="mt-1 text-xs text-[var(--df-text-secondary)]">Abertas sem atribuição</p>
        </Card>
        <Card
          padding="md"
          className="!border-[color:var(--df-danger-sla-border)] !bg-[var(--df-danger-sla-bg)] !p-5 !shadow-none ring-0"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--df-danger-sla-label)]">SLA crítico</p>
          <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-[var(--df-danger-sla-value)]">{data.operation.critical}</p>
          <p className="mt-1 text-xs text-[var(--df-danger-sla-caption)]">Aguardam há ≥ 30 min</p>
        </Card>
        <Card padding="md" className="!p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--df-text-secondary)]">Tempo médio em fila</p>
          <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-[var(--df-text-primary)]">{formatMs(data.operation.avgFirstResponseMs)}</p>
          <p className="mt-1 text-xs text-[var(--df-text-secondary)]">Até à primeira resposta (período)</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Equipa" description="Atividade e fechos no período." />
          <div className="grid gap-3 px-6 pb-4 sm:grid-cols-4">
            <div className="rounded-lg border df-border-brand bg-[var(--df-bg-app)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-[var(--df-text-muted)]">Threads atendidas</p>
              <p className="text-xl font-bold tabular-nums text-[var(--df-text-primary)]">{data.team.handled}</p>
            </div>
            <div className="rounded-lg border df-border-brand bg-[var(--df-bg-app)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-[var(--df-text-muted)]">Tempo médio de atendimento</p>
              <p className="text-xl font-bold tabular-nums text-[var(--df-text-primary)]">{formatMs(data.team.avgResponseMs)}</p>
            </div>
            <div className="rounded-lg border df-border-brand bg-[var(--df-bg-app)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-[var(--df-text-muted)]">Tempo médio em fila</p>
              <p className="text-xl font-bold tabular-nums text-[var(--df-text-primary)]">{formatMs(data.team.avgFirstResponseMs)}</p>
            </div>
            <div className="rounded-lg border df-border-brand bg-[var(--df-bg-app)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-[var(--df-text-muted)]">Fechadas</p>
              <p className="text-xl font-bold tabular-nums text-[var(--df-text-primary)]">{data.team.closed}</p>
            </div>
          </div>
          {data.team.agents.length === 0 ? (
            <div className="px-6 pb-6">
              <StateEmpty
                title="Sem utilizadores na conta"
                description="Convide agentes em Configurações para ver desempenho por pessoa."
                nextStep="Abra Equipe no menu para ver quem já está no tenant ou convide novos membros."
                className="py-8"
              />
            </div>
          ) : (
            <div className="px-2 pb-6">
              <div className="df-table-wrap">
                <table className="df-table" data-testid="manager-dashboard-agents-table">
                  <thead>
                    <tr>
                      <th>Agente</th>
                      <th className="text-right">Conversas por responsável</th>
                      <th className="text-right">Tempo médio de atendimento</th>
                      <th className="text-right">Tempo médio em fila</th>
                      <th className="text-right">Fechadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.team.agents.map((a) => (
                      <tr key={a.userId}>
                        <td className="font-medium text-[var(--df-text-primary)]">
                        {a.name ?? a.email ?? a.userId.slice(0, 8)}
                      </td>
                        <td className="text-right tabular-nums text-[var(--df-text-primary)]">{a.handled}</td>
                        <td className="text-right tabular-nums text-[var(--df-text-secondary)]">{formatMs(a.avgResponseMs)}</td>
                        <td className="text-right tabular-nums text-[var(--df-text-secondary)]">{formatMs(a.avgFirstResponseMs)}</td>
                        <td className="text-right tabular-nums text-[var(--df-text-primary)]">{a.closed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Automação & IA" description="Proporções no período (mensagens e auditoria)." />
          <ul className="space-y-2 px-6 pb-6 text-sm" data-testid="manager-dashboard-automation">
            <li className="flex justify-between gap-2 border-b df-border-brand pb-2">
              <span className="text-[var(--df-text-secondary)]">Mensagens automáticas / IA</span>
              <span className="font-semibold tabular-nums text-[var(--df-text-primary)]">{formatPct(data.automation.autoRate)}</span>
            </li>
            <li className="flex justify-between gap-2 border-b df-border-brand pb-2">
              <span className="text-[var(--df-text-secondary)]">Mensagens IA vs fechos no período</span>
              <span className="font-semibold tabular-nums text-[var(--df-text-primary)]">{formatPct(data.automation.resolvedByAiRate)}</span>
            </li>
            <li className="flex justify-between gap-2 border-b df-border-brand pb-2">
              <span className="text-[var(--df-text-secondary)]">Transbordo humano (agente / agente+IA)</span>
              <span className="font-semibold tabular-nums text-[var(--df-text-primary)]">{formatPct(data.automation.fallbackRate)}</span>
            </li>
            <li className="flex justify-between gap-2 border-b df-border-brand pb-2">
              <span className="text-[var(--df-text-secondary)]">Uso de playbook (vs threads ativas)</span>
              <span className="font-semibold tabular-nums text-[var(--df-text-primary)]">{formatPct(data.automation.playbookUsageRate)}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-[var(--df-text-secondary)]">Follow-up sugerido</span>
              <span className="font-semibold tabular-nums text-[var(--df-text-primary)]">{formatPct(data.automation.followUpUsageRate)}</span>
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
                nextStep="Na Inbox, aplique tags (ex.: Lead, Proposta) às threads — os totais atualizam neste cartão."
                className="py-8"
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
                  className="rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">{FUNNEL_LABELS[key]}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--df-text-primary)]">{v}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--df-bg-app)]">
                    <div
                      className="h-full rounded-full bg-[var(--df-brand-600)] transition-[width] duration-500 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--df-text-secondary)]">{pct}% do funil etiquetado</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
