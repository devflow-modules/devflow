"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StateEmpty, StateError } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import {
  buildManagerActions,
  generateManagerInsights,
  type ManagerDashboardFunnel,
  type ManagerDashboardLeadQuality,
  type ManagerDashboardMetrics,
  type ManagerDashboardOpportunities,
} from "./managerDashboardAi";
import { ManagerActionsList } from "@/components/dashboard/ai/ManagerActionsList";
import { ManagerInsights } from "@/components/dashboard/ai/ManagerInsights";
import { KpiCardEnhanced } from "@/components/dashboard/ai/KpiCardEnhanced";
import { DashboardAiSkeleton } from "@/components/dashboard/ai/DashboardAiSkeleton";
import { FunnelStageLegend } from "@/components/dashboard/ai/FunnelStageLegend";
import { SystemHealthPanel } from "@/components/dashboard/ai/SystemHealthPanel";
import type { SystemHealthSnapshot } from "@/modules/dashboard/systemHealthService";
import type { SystemHealthSummary } from "@/modules/dashboard/buildSystemHealthSummary";
import { Button } from "@/components/ui/button";

type LogRow = {
  type: "auto_reply" | "fallback" | "error" | "blocked_by_guard";
  reason: string;
  createdAt: string;
  conversationId: string | null;
};

function badgeClass(type: LogRow["type"]): string {
  switch (type) {
    case "auto_reply":
      return "bg-emerald-100 text-emerald-900 ring-emerald-600/20";
    case "fallback":
      return "bg-amber-100 text-amber-950 ring-amber-600/25";
    case "error":
      return "bg-red-100 text-red-900 ring-red-600/20";
    case "blocked_by_guard":
      return "bg-[color-mix(in_srgb,var(--df-border-dark)_65%,var(--df-bg-elevated))] text-[var(--df-text-primary)] ring-[var(--df-border-dark)]";
    default:
      return "bg-[var(--df-bg-app)] text-[var(--df-text-primary)]";
  }
}

function typeLabel(type: LogRow["type"]): string {
  switch (type) {
    case "auto_reply":
      return "Resposta automática";
    case "fallback":
      return "Fallback";
    case "error":
      return "Erro";
    case "blocked_by_guard":
      return "Bloqueio (guard)";
    default:
      return type;
  }
}

export function DashboardAiClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ManagerDashboardMetrics | null>(null);
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [funnel, setFunnel] = useState<ManagerDashboardFunnel | null>(null);
  const [leadQuality, setLeadQuality] = useState<ManagerDashboardLeadQuality | null>(null);
  const [opportunities, setOpportunities] = useState<ManagerDashboardOpportunities | null>(null);
  const [healthSnapshot, setHealthSnapshot] = useState<SystemHealthSnapshot | null>(null);
  const [healthSummary, setHealthSummary] = useState<SystemHealthSummary | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const loadHealth = useCallback(async () => {
    setHealthError(null);
    try {
      const res = await fetchProtected("/api/dashboard/system-health");
      const j = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { snapshot: SystemHealthSnapshot; summary: SystemHealthSummary };
        error?: string;
      };
      if (!res.ok) {
        setHealthSnapshot(null);
        setHealthSummary(null);
        setHealthError(protectedApiUserMessage(res.status, j));
        return;
      }
      if (j.data?.snapshot && j.data?.summary) {
        setHealthSnapshot(j.data.snapshot);
        setHealthSummary(j.data.summary);
      } else {
        setHealthError("Resposta incompleta do servidor");
      }
    } catch {
      setHealthError("Erro ao carregar saúde do canal");
      setHealthSnapshot(null);
      setHealthSummary(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [resM, resL, resF, resQ, resO] = await Promise.all([
        fetchProtected("/api/ai/metrics?days=30"),
        fetchProtected("/api/ai/logs?limit=40"),
        fetchProtected("/api/ai/funnel-metrics"),
        fetchProtected("/api/ai/lead-metrics"),
        fetchProtected("/api/ai/opportunity-metrics"),
      ]);

      const jm = (await resM.json().catch(() => ({}))) as {
        success?: boolean;
        data?: ManagerDashboardMetrics;
        error?: string;
      };
      const jl = (await resL.json().catch(() => ({}))) as {
        success?: boolean;
        data?: LogRow[];
        error?: string;
      };
      const jf = (await resF.json().catch(() => ({}))) as {
        success?: boolean;
        data?: ManagerDashboardFunnel;
        error?: string;
      };
      const jq = (await resQ.json().catch(() => ({}))) as {
        success?: boolean;
        data?: ManagerDashboardLeadQuality;
        error?: string;
      };
      const jo = (await resO.json().catch(() => ({}))) as {
        success?: boolean;
        data?: ManagerDashboardOpportunities;
        error?: string;
      };

      if (!resM.ok) {
        setError(protectedApiUserMessage(resM.status, jm));
        return;
      }
      if (!resL.ok) {
        setError(protectedApiUserMessage(resL.status, jl));
        return;
      }
      if (!resF.ok) {
        setError(protectedApiUserMessage(resF.status, jf));
        return;
      }
      if (!resQ.ok) {
        setError(protectedApiUserMessage(resQ.status, jq));
        return;
      }
      if (!resO.ok) {
        setError(protectedApiUserMessage(resO.status, jo));
        return;
      }
      if (jm.data) setMetrics(jm.data);
      setLogs(jl.data ?? []);
      if (jf.data) setFunnel(jf.data);
      if (jq.data) setLeadQuality(jq.data);
      if (jo.data) setOpportunities(jo.data);
    } catch {
      setError("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setHealthLoading(true);
    void loadHealth();
  }, [loadHealth]);

  const managerActions = useMemo(
    () => buildManagerActions(opportunities, funnel),
    [opportunities, funnel]
  );

  const insightLines = useMemo(
    () => generateManagerInsights(metrics, funnel, opportunities, leadQuality),
    [metrics, funnel, opportunities, leadQuality]
  );

  const aiDashboardHeader = (
    <PageHeader
      eyebrow="Operação"
      title="IA no atendimento"
      description="Saúde do canal (webhook, filas), automação, funil e oportunidades — visão de gestão para afinar IA e priorizar conversas."
      layout="split"
      showDivider
      tone="admin"
      quickActions={
        <>
          <Link href="/settings" className="df-quick-action">
            Motor (config. gerais)
          </Link>
          <Link href="/settings/ai" className="df-quick-action">
            IA de atendimento
          </Link>
          <Link href="/settings/ai-analytics" className="df-quick-action">
            Uso e custos de IA
          </Link>
          <Link href="/inbox" className="df-quick-action">
            Abrir Inbox
          </Link>
        </>
      }
    />
  );

  if (loading) {
    return (
      <div className="df-stack min-w-0">
        {aiDashboardHeader}
        <DashboardAiSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="df-stack min-w-0">
        {aiDashboardHeader}
        <StateError message={error} onRetry={load} retryLabel="Tentar novamente" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="df-stack min-w-0">
        {aiDashboardHeader}
        <StateEmpty
          title="Métricas indisponíveis"
          description="Não foi possível obter o resumo de IA para o período."
          nextStep="Verifique a sessão ou tente novamente dentro de instantes."
          action={
            <Button variant="secondary" type="button" className={buttonClassName("primary")} onClick={() => void load()}>
              Recarregar
            </Button>
          }
        />
      </div>
    );
  }

  const isEmpty = metrics.totalMessages === 0;
  const automation = metrics.automationPercent;
  const humanish = metrics.blockedDecisions + metrics.fallbacks + metrics.errors;

  const kpiCards = [
    {
      label: "Total de eventos",
      value: metrics.totalMessages,
      hint: `Últimos ${metrics.periodDays} dias`,
      emphasis: true,
    },
    {
      label: "Respostas automáticas",
      value: metrics.autoReplies,
      hint: "IA gerou e enviou",
      emphasis: false,
    },
    {
      label: "Fallbacks",
      value: metrics.fallbacks,
      hint: "LLM sem resposta útil",
      emphasis: false,
    },
    {
      label: "Erros",
      value: metrics.errors,
      hint: "Provedor ou pipeline",
      emphasis: false,
    },
    {
      label: "% automação",
      value: automation != null ? `${automation}%` : "—",
      hint: "auto_reply ÷ total de eventos",
      emphasis: true,
    },
    {
      label: "Latência média",
      value: `${metrics.avgLatency} ms`,
      hint: "Quando registado",
      emphasis: false,
    },
  ];

  const showDecisionEmpty =
    managerActions.length === 0 &&
    insightLines.length === 0 &&
    isEmpty &&
    (!leadQuality || leadQuality.high + leadQuality.medium + leadQuality.low === 0);

  return (
    <div className="df-stack min-w-0">
      {aiDashboardHeader}

      <SystemHealthPanel
        snapshot={healthLoading ? null : healthSnapshot}
        summary={healthLoading ? null : healthSummary}
        error={healthError}
        onRefresh={() => {
          setHealthLoading(true);
          void loadHealth();
        }}
      />

      <ManagerActionsList actions={managerActions} />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/inbox?filter=high_no_response"
          className={buttonClassName("secondary", "inline-flex text-sm")}
        >
          Ver leads HIGH
        </Link>
        <Link
          href="/inbox?phase=in_attendance"
          className={buttonClassName("secondary", "inline-flex text-sm")}
        >
          Ver negociações
        </Link>
        <Link href="/inbox" className={buttonClassName("primary", "inline-flex text-sm")}>
          Ir para inbox
        </Link>
      </div>

      {showDecisionEmpty ? (
        <StateEmpty
          title="Ainda não há decisões sugeridas"
          description="Insights e acções recomendadas aparecem quando houver conversas e sinais de funil no período."
          nextStep="Abra a Inbox para gerar tráfego ou ajuste a IA em Configurações."
          className="border border-dashed df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_55%,var(--df-bg-elevated))] py-8"
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] p-5 shadow-sm ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_75%,transparent)]"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">{c.label}</p>
            <p
              className={`mt-2 tabular-nums text-[var(--df-text-primary)] ${c.emphasis ? "text-3xl font-bold" : "text-2xl font-bold"}`}
            >
              {c.value}
            </p>
            <p className="mt-1 text-xs text-[var(--df-text-muted)]">{c.hint}</p>
          </div>
        ))}
      </div>

      <ManagerInsights lines={insightLines} />

      {leadQuality && opportunities ? (
        <div className="rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] p-6 shadow-sm ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_80%,transparent)]">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">Qualidade dos leads</h2>
          <p className="mt-2 text-sm text-[var(--df-text-secondary)]">
            Prioridade automática a partir do score CRM. Combine com pendências reais no inbox.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCardEnhanced
              label="High"
              value={leadQuality.high}
              subHint={
                opportunities.highPending > 0
                  ? `(${opportunities.highPending} sem resposta)`
                  : "(nenhuma pendência HIGH)"
              }
              hint="Prioridade CRM"
              emphasis
            />
            <KpiCardEnhanced
              label="Medium"
              value={leadQuality.medium}
              hint="Prioridade CRM"
            />
            <KpiCardEnhanced
              label="Low"
              value={leadQuality.low}
              hint="Prioridade CRM"
            />
            <KpiCardEnhanced
              label="Score médio"
              value={leadQuality.avgScore}
              hint="Média nas conversas abertas"
              tooltip="Score alto = maior chance de fechar. Score baixo = pouco engajamento."
            />
          </div>
        </div>
      ) : null}

      {opportunities ? (
        <div className="rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] p-6 shadow-sm ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_80%,transparent)]">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">Oportunidades</h2>
          <p className="mt-2 text-sm text-[var(--df-text-secondary)]">
            Sinais comerciais em tempo real (inbox + automações de follow-up / reativação).
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-red-100 bg-red-50/80 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-800">
                Leads HIGH sem resposta
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-red-900">{opportunities.highPending}</p>
            </div>
            <div className="rounded-lg border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_45%,var(--df-bg-elevated))] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">Conversas paradas</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--df-text-primary)]">{opportunities.stalled}</p>
              <p className="mt-1 text-[10px] text-[var(--df-text-muted)]">Qualificação/negociação sem mensagem há 2h+</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-900">Em negociação</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-950">{opportunities.negotiating}</p>
            </div>
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/80 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-900">Reativações na fila</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-950">
                {opportunities.reactivationQueued}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {funnel ? (
        <div className="rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] p-6 shadow-sm ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_80%,transparent)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">Funil comercial (conversas)</h2>
            <FunnelStageLegend />
          </div>
          <p className="mt-2 text-sm text-[var(--df-text-secondary)]">
            <span className="font-semibold text-[var(--df-brand-700)]">{funnel.lead}</span> leads activos ·{" "}
            <span className="font-semibold text-[var(--df-text-primary)]">{funnel.qualifying + funnel.negotiating}</span> em
            qualificação/negociação · <span className="font-semibold text-[var(--df-text-primary)]">{funnel.closed}</span>{" "}
            fechados
          </p>
          <div className="mt-4 space-y-3">
            {(
              [
                ["lead", "Lead", funnel.lead],
                ["qualifying", "Qualificação", funnel.qualifying],
                ["negotiating", "Negociação", funnel.negotiating],
                ["support", "Suporte", funnel.support],
                ["closed", "Fechado", funnel.closed],
              ] as const
            ).map(([key, label, n]) => {
              const max = Math.max(
                1,
                funnel.lead + funnel.qualifying + funnel.negotiating + funnel.support + funnel.closed
              );
              const pct = Math.round((n / max) * 100);
              return (
                <div key={key}>
                  <div className="mb-1 flex justify-between text-xs font-medium text-[var(--df-text-secondary)]">
                    <span>{label}</span>
                    <span className="tabular-nums text-[var(--df-text-primary)]">{n}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--df-bg-app)]">
                    <div
                      className="h-full rounded-full bg-[var(--df-brand-500)]/85"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {isEmpty ? (
        <StateEmpty
          title="Sem eventos de IA no período"
          description="Quando a automação responder, falhar ou for bloqueada por guardas, os totais e a lista de eventos preenchem automaticamente."
          nextStep="Envie mensagens de teste na Inbox ou revise o comportamento em Configurações → IA de atendimento."
          className="border border-dashed df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_52%,var(--df-bg-elevated))] py-10"
          action={
            <Link href="/settings/ai" className={buttonClassName("secondary", "inline-flex")}>
              Rever configuração de IA
            </Link>
          }
        />
      ) : null}

      {!isEmpty ? (
        <div className="rounded-xl border df-border-brand bg-gradient-to-br from-[var(--df-bg-app)] to-[var(--df-bg-elevated)] p-6 shadow-sm ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_80%,transparent)]">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">Resumo</h2>
          <ul className="mt-4 space-y-3 text-base text-[var(--df-text-primary)]">
            <li>
              <span className="font-semibold text-[var(--df-brand-700)]">
                {automation != null ? `${automation}%` : "—"}
              </span>{" "}
              dos eventos registados foram respostas automáticas bem concluídas (no período).
            </li>
            <li>
              <span className="font-semibold text-[var(--df-text-primary)]">{humanish}</span> eventos indicam conversas que
              não seguiram só com resposta automática (bloqueio do guard, fallback de LLM ou erro).
            </li>
          </ul>
          <p className="mt-3 text-xs text-[var(--df-text-muted)]">
            Percentagens de fallback e erro vs. total:{" "}
            {metrics.fallbackPercent != null ? `${metrics.fallbackPercent}%` : "—"} fallback ·{" "}
            {metrics.errorPercent != null ? `${metrics.errorPercent}%` : "—"} erros
          </p>
        </div>
      ) : null}

      <section className="min-w-0">
        <h2 className="text-sm font-bold text-[var(--df-text-primary)]">Eventos recentes</h2>
        <p className="mt-1 text-xs text-[var(--df-text-muted)]">Últimos registos operacionais (tipo, motivo, conversa).</p>
        {!logs || logs.length === 0 ? (
          <StateEmpty
            title="Sem eventos recentes na lista"
            description="Os últimos registos de automação e erros aparecem aqui quando existirem."
            nextStep="Quando houver novas interações com a IA, os registos aparecem aqui em tempo quase real."
            className="mt-4 border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_50%,var(--df-bg-elevated))] py-6 text-left"
          />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_55%,var(--df-bg-elevated))] text-xs font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Motivo / detalhe</th>
                  <th className="px-4 py-3">Quando</th>
                  <th className="px-4 py-3">Conversa</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row, i) => (
                  <tr key={`${row.createdAt}-${i}`} className="border-b df-border-brand last:border-0">
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badgeClass(row.type)}`}
                      >
                        {typeLabel(row.type)}
                      </span>
                    </td>
                    <td className="max-w-md px-4 py-3 align-top text-[var(--df-text-primary)]">
                      <span className="line-clamp-3 break-words">{row.reason}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-[var(--df-text-secondary)] tabular-nums">
                      {new Date(row.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-xs text-[var(--df-text-muted)]">
                      {row.conversationId ? (
                        <span className="break-all">{row.conversationId.slice(0, 12)}…</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Link href="/dashboard" className={buttonClassName("secondary", "w-fit")}>
        Voltar ao painel
      </Link>
    </div>
  );
}
