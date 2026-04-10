"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StateLoading, StateError } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";

type MetricsData = {
  totalMessages: number;
  autoReplies: number;
  fallbacks: number;
  errors: number;
  blockedDecisions: number;
  avgLatency: number;
  periodDays: number;
  automationPercent: number | null;
  fallbackPercent: number | null;
  errorPercent: number | null;
};

type LogRow = {
  type: "auto_reply" | "fallback" | "error" | "blocked_by_guard";
  reason: string;
  createdAt: string;
  conversationId: string | null;
};

type FunnelData = {
  lead: number;
  qualifying: number;
  negotiating: number;
  support: number;
  closed: number;
};

type LeadQualityData = {
  high: number;
  medium: number;
  low: number;
  avgScore: number;
};

type OpportunityData = {
  highPending: number;
  stalled: number;
  negotiating: number;
  reactivationQueued: number;
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
      return "bg-slate-200 text-slate-800 ring-slate-500/20";
    default:
      return "bg-slate-100 text-slate-800";
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
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [leadQuality, setLeadQuality] = useState<LeadQualityData | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityData | null>(null);

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
        data?: MetricsData;
        error?: string;
      };
      const jl = (await resL.json().catch(() => ({}))) as {
        success?: boolean;
        data?: LogRow[];
        error?: string;
      };
      const jf = (await resF.json().catch(() => ({}))) as {
        success?: boolean;
        data?: FunnelData;
        error?: string;
      };
      const jq = (await resQ.json().catch(() => ({}))) as {
        success?: boolean;
        data?: LeadQualityData;
        error?: string;
      };
      const jo = (await resO.json().catch(() => ({}))) as {
        success?: boolean;
        data?: OpportunityData;
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
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <StateLoading message="A carregar operação de IA…" />;
  }
  if (error) {
    return <StateError message={error} onRetry={load} />;
  }
  if (!metrics) {
    return null;
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

  return (
    <div className="df-stack min-w-0">
      <PageHeader
        eyebrow="Operação"
        title="IA no atendimento"
        description="Métricas agregadas e eventos recentes (sem texto de conversas). Acesso exclusivo para gestão."
        layout="split"
        showDivider
        tone="admin"
        quickActions={
          <>
            <Link href="/settings/ai" className="df-quick-action">
              Configurar IA
            </Link>
            <Link href="/settings/ai-analytics" className="df-quick-action">
              Uso e custos
            </Link>
          </>
        }
      />

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
          <p className="text-lg font-semibold text-slate-900">Ainda não há eventos de IA no período</p>
          <p className="mt-2 text-sm text-slate-600">
            Quando a automação responder ou for bloqueada, os números e a lista abaixo passam a aparecer aqui.
          </p>
          <Link href="/settings/ai" className={`${buttonClassName("secondary", "mt-6 inline-flex")}`}>
            Rever configuração de IA
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
            <p
              className={`mt-2 tabular-nums text-slate-900 ${c.emphasis ? "text-3xl font-bold" : "text-2xl font-bold"}`}
            >
              {c.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{c.hint}</p>
          </div>
        ))}
      </div>

      {leadQuality ? (
        <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Qualidade dos leads</h2>
          <p className="mt-2 text-sm text-slate-600">
            Conversas abertas classificadas por prioridade automática (score CRM). Destaque para leads{" "}
            <span className="font-semibold text-red-600">HIGH (🔥)</span>.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-red-100 bg-red-50/80 px-4 py-3 ring-1 ring-red-200/40">
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-800">High</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-red-900">{leadQuality.high}</p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50/70 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900">Medium</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-amber-950">{leadQuality.medium}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Low</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800">{leadQuality.low}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Score médio</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{leadQuality.avgScore}</p>
            </div>
          </div>
        </div>
      ) : null}

      {opportunities ? (
        <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Oportunidades</h2>
          <p className="mt-2 text-sm text-slate-600">
            Sinais comerciais em tempo real (inbox + automações de follow-up / reativação).
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-red-100 bg-red-50/80 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-800">🔥 Leads HIGH sem resposta</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-red-900">{opportunities.highPending}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">⏳ Conversas paradas</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{opportunities.stalled}</p>
              <p className="mt-1 text-[10px] text-slate-500">Qualificação/negociação sem mensagem há 2h+</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-900">💰 Em negociação</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-950">{opportunities.negotiating}</p>
            </div>
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/80 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-900">🔄 Reativações na fila</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-950">
                {opportunities.reactivationQueued}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {funnel ? (
        <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Funil comercial (conversas)</h2>
          <p className="mt-2 text-sm text-slate-600">
            <span className="font-semibold text-[var(--df-brand-700)]">{funnel.lead}</span> leads activos ·{" "}
            <span className="font-semibold text-slate-900">{funnel.qualifying + funnel.negotiating}</span> em
            qualificação/negociação · <span className="font-semibold text-slate-900">{funnel.closed}</span>{" "}
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
                  <div className="mb-1 flex justify-between text-xs font-medium text-slate-600">
                    <span>{label}</span>
                    <span className="tabular-nums text-slate-900">{n}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
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

      {!isEmpty ? (
        <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Resumo</h2>
          <ul className="mt-4 space-y-3 text-base text-slate-800">
            <li>
              <span className="font-semibold text-[var(--df-brand-700)]">
                {automation != null ? `${automation}%` : "—"}
              </span>{" "}
              dos eventos registados foram respostas automáticas bem concluídas (no período).
            </li>
            <li>
              <span className="font-semibold text-slate-900">{humanish}</span> eventos indicam conversas que
              não seguiram só com resposta automática (bloqueio do guard, fallback de LLM ou erro).
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Percentagens de fallback e erro vs. total:{" "}
            {metrics.fallbackPercent != null ? `${metrics.fallbackPercent}%` : "—"} fallback ·{" "}
            {metrics.errorPercent != null ? `${metrics.errorPercent}%` : "—"} erros
          </p>
        </div>
      ) : null}

      <section className="min-w-0">
        <h2 className="text-sm font-bold text-slate-900">Eventos recentes</h2>
        <p className="mt-1 text-xs text-slate-500">Últimos registos operacionais (tipo, motivo, conversa).</p>
        {!logs || logs.length === 0 ? (
          <p className="mt-4 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-6 text-sm text-slate-600">
            Sem linhas para mostrar. Ajuste o período nas métricas ou aguarde novos eventos.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Motivo / detalhe</th>
                  <th className="px-4 py-3">Quando</th>
                  <th className="px-4 py-3">Conversa</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row, i) => (
                  <tr key={`${row.createdAt}-${i}`} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badgeClass(row.type)}`}
                      >
                        {typeLabel(row.type)}
                      </span>
                    </td>
                    <td className="max-w-md px-4 py-3 align-top text-slate-800">
                      <span className="line-clamp-3 break-words">{row.reason}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-slate-600 tabular-nums">
                      {new Date(row.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-xs text-slate-500">
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
