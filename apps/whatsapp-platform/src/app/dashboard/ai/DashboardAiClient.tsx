"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StateEmpty } from "@/components/ui/app-states";
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
import {
  DashboardAiBlockSkeleton,
  DashboardAiSkeleton,
} from "@/components/dashboard/ai/DashboardAiSkeleton";
import { DashboardAiSurfaceError } from "@/components/dashboard/ai/DashboardAiSurfaceError";
import { FunnelStageLegend } from "@/components/dashboard/ai/FunnelStageLegend";
import { SystemHealthPanel } from "@/components/dashboard/ai/SystemHealthPanel";
import { HealthCriticalSignal } from "@/components/dashboard/ai/HealthCriticalSignal";
import type { SystemHealthSnapshot } from "@/modules/dashboard/systemHealthService";
import type { SystemHealthSummary } from "@/modules/dashboard/buildSystemHealthSummary";
import {
  DASHBOARD_AI_DESCRIPTION,
  DASHBOARD_AI_HEADER_QUICK_LINKS,
  DASHBOARD_AI_HEALTH_DETAILS_SUMMARY,
  DASHBOARD_AI_TITLE,
} from "./dashboardAiChrome";
import {
  DASHBOARD_AI_ADVANCED_METRICS_SUMMARY,
  DASHBOARD_AI_EXTRA_EVENT_METRICS_SUMMARY,
  buildEssentialKpiCards,
  buildExtraEventKpiCards,
} from "./dashboardAiMetrics";
import { DASHBOARD_AI_FUNNEL_STAGES } from "./dashboardAiFunnelCopy";
import {
  buildInboxConversationHref,
  inboxConversationLinkLabel,
} from "./dashboardAiEventLinks";
import {
  applySurfaceResult,
  fetchAiSurfaceData,
  initialSurface,
  type SurfaceSnapshot,
} from "./dashboardAiSurfaces";

type LogRow = {
  type: "auto_reply" | "fallback" | "error" | "blocked_by_guard";
  reason: string;
  createdAt: string;
  conversationId: string | null;
};

function badgeClass(type: LogRow["type"]): string {
  switch (type) {
    case "auto_reply":
      return "df-badge-success !rounded-full !px-2.5 !py-0.5 !text-xs !font-semibold !ring-1";
    case "fallback":
      return "df-badge-warning !rounded-full !px-2.5 !py-0.5 !text-xs !font-semibold !ring-1";
    case "error":
      return "df-badge-error !rounded-full !px-2.5 !py-0.5 !text-xs !font-semibold !ring-1";
    case "blocked_by_guard":
      return "df-badge-muted !rounded-full !px-2.5 !py-0.5 !text-xs !font-semibold !ring-1";
    default:
      return "df-badge-muted !rounded-full !px-2.5 !py-0.5 !text-xs !font-semibold !ring-1";
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
  const [metrics, setMetrics] = useState<SurfaceSnapshot<ManagerDashboardMetrics>>(() =>
    initialSurface()
  );
  const [logs, setLogs] = useState<SurfaceSnapshot<LogRow[]>>(() => initialSurface());
  const [funnel, setFunnel] = useState<SurfaceSnapshot<ManagerDashboardFunnel>>(() =>
    initialSurface()
  );
  const [leadQuality, setLeadQuality] = useState<SurfaceSnapshot<ManagerDashboardLeadQuality>>(
    () => initialSurface()
  );
  const [opportunities, setOpportunities] = useState<
    SurfaceSnapshot<ManagerDashboardOpportunities>
  >(() => initialSurface());

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

  const loadMetrics = useCallback(async () => {
    setMetrics((prev) => ({ ...prev, status: "loading", error: null }));
    const result = await fetchAiSurfaceData<ManagerDashboardMetrics>("/api/ai/metrics?days=30");
    setMetrics((prev) => applySurfaceResult(result, prev.data));
  }, []);

  const loadLogs = useCallback(async () => {
    setLogs((prev) => ({ ...prev, status: "loading", error: null }));
    const result = await fetchAiSurfaceData<LogRow[]>("/api/ai/logs?limit=40", {
      allowEmptyArray: true,
    });
    setLogs((prev) => applySurfaceResult(result, prev.data));
  }, []);

  const loadFunnel = useCallback(async () => {
    setFunnel((prev) => ({ ...prev, status: "loading", error: null }));
    const result = await fetchAiSurfaceData<ManagerDashboardFunnel>("/api/ai/funnel-metrics");
    setFunnel((prev) => applySurfaceResult(result, prev.data));
  }, []);

  const loadLeadQuality = useCallback(async () => {
    setLeadQuality((prev) => ({ ...prev, status: "loading", error: null }));
    const result = await fetchAiSurfaceData<ManagerDashboardLeadQuality>("/api/ai/lead-metrics");
    setLeadQuality((prev) => applySurfaceResult(result, prev.data));
  }, []);

  const loadOpportunities = useCallback(async () => {
    setOpportunities((prev) => ({ ...prev, status: "loading", error: null }));
    const result = await fetchAiSurfaceData<ManagerDashboardOpportunities>(
      "/api/ai/opportunity-metrics"
    );
    setOpportunities((prev) => applySurfaceResult(result, prev.data));
  }, []);

  useEffect(() => {
    void loadMetrics();
    void loadLogs();
    void loadFunnel();
    void loadLeadQuality();
    void loadOpportunities();
  }, [loadMetrics, loadLogs, loadFunnel, loadLeadQuality, loadOpportunities]);

  useEffect(() => {
    setHealthLoading(true);
    void loadHealth();
  }, [loadHealth]);

  const essentialBootstrapping =
    (metrics.status === "loading" && metrics.data == null) ||
    (opportunities.status === "loading" && opportunities.data == null);

  const managerActions = useMemo(
    () => buildManagerActions(opportunities.data, funnel.data),
    [opportunities.data, funnel.data]
  );

  const insightLines = useMemo(
    () =>
      generateManagerInsights(metrics.data, funnel.data, opportunities.data, leadQuality.data),
    [metrics.data, funnel.data, opportunities.data, leadQuality.data]
  );

  const aiDashboardHeader = (
    <PageHeader
      eyebrow="Operação"
      title={DASHBOARD_AI_TITLE}
      description={DASHBOARD_AI_DESCRIPTION}
      layout="split"
      showDivider
      tone="admin"
      quickActions={
        <>
          {DASHBOARD_AI_HEADER_QUICK_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="df-quick-action">
              {item.label}
            </Link>
          ))}
        </>
      }
    />
  );

  if (essentialBootstrapping) {
    return (
      <div className="df-stack min-w-0">
        {aiDashboardHeader}
        <DashboardAiSkeleton />
      </div>
    );
  }

  const metricsData = metrics.data;
  const isEmpty = metricsData != null && metricsData.totalMessages === 0;
  const essentialKpis = metricsData ? buildEssentialKpiCards(metricsData) : [];
  const extraEventKpis = metricsData ? buildExtraEventKpiCards(metricsData) : [];

  const showDecisionEmpty =
    opportunities.status === "ready" &&
    opportunities.data != null &&
    managerActions.length === 0;
  const healthDetailsOpen =
    Boolean(healthError) ||
    healthSummary?.overall === "error" ||
    healthSummary?.overall === "attention";

  return (
    <div className="df-stack min-w-0" data-testid="dashboard-ai-page">
      {aiDashboardHeader}

      <HealthCriticalSignal
        summary={healthSummary}
        error={healthError}
        loading={healthLoading}
      />

      {opportunities.status === "loading" && opportunities.data == null ? (
        <DashboardAiBlockSkeleton heightClass="h-28" testId="dashboard-ai-actions-skeleton" />
      ) : opportunities.status === "error" && opportunities.data == null ? (
        <DashboardAiSurfaceError
          title="Ações indisponíveis"
          message={opportunities.error ?? "Não foi possível carregar as prioridades."}
          onRetry={() => void loadOpportunities()}
          testId="dashboard-ai-actions-error"
        />
      ) : showDecisionEmpty ? (
        <div data-testid="dashboard-ai-actions-empty">
          <StateEmpty
            title="Sem ações urgentes"
            description="Quando houver leads HIGH, conversas paradas ou reativações, as prioridades aparecem aqui."
            nextStep="Abra a Inbox quando quiser trabalhar a fila, ou afine a IA em Configurações."
            className="border border-dashed df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_55%,var(--df-bg-elevated))] py-8"
          />
        </div>
      ) : managerActions.length > 0 ? (
        <ManagerActionsList actions={managerActions} />
      ) : null}

      <details
        className="rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_52%,var(--df-bg-elevated))] open:pb-4"
        data-testid="system-health-details"
        open={healthDetailsOpen || undefined}
      >
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--df-text-primary)] [&::-webkit-details-marker]:hidden">
          {DASHBOARD_AI_HEALTH_DETAILS_SUMMARY}
        </summary>
        <div className="border-t df-border-brand px-4 pt-4">
          <SystemHealthPanel
            snapshot={healthSnapshot}
            summary={healthSummary}
            error={healthError}
            hideSummaryBanner
            onRefresh={() => {
              setHealthLoading(true);
              void loadHealth();
            }}
          />
        </div>
      </details>

      {metrics.status === "loading" && metricsData == null ? (
        <DashboardAiBlockSkeleton heightClass="h-28" testId="dashboard-ai-metrics-skeleton" />
      ) : metrics.status === "error" && metricsData == null ? (
        <DashboardAiSurfaceError
          title="Métricas indisponíveis"
          message={metrics.error ?? "Não foi possível obter o resumo de IA para o período."}
          onRetry={() => void loadMetrics()}
          testId="dashboard-ai-metrics-error"
        />
      ) : metricsData ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="dashboard-ai-essential-kpis">
          {essentialKpis.map((c) => (
            <KpiCardEnhanced
              key={c.label}
              label={c.label}
              value={c.value}
              hint={c.hint}
              emphasis={c.emphasis}
            />
          ))}
        </div>
      ) : null}

      <ManagerInsights lines={insightLines} />

      <details
        className="rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_50%,var(--df-bg-elevated))] open:pb-4"
        data-testid="dashboard-ai-advanced-metrics"
      >
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--df-text-primary)] [&::-webkit-details-marker]:hidden">
          {DASHBOARD_AI_ADVANCED_METRICS_SUMMARY}
        </summary>
        <div className="space-y-4 border-t df-border-brand px-4 pt-4">
          {leadQuality.status === "loading" && leadQuality.data == null ? (
            <DashboardAiBlockSkeleton heightClass="h-36" testId="dashboard-ai-lead-skeleton" />
          ) : leadQuality.status === "error" && leadQuality.data == null ? (
            <DashboardAiSurfaceError
              title="Qualidade de leads indisponível"
              message={leadQuality.error ?? "Não foi possível carregar a qualidade dos leads."}
              onRetry={() => void loadLeadQuality()}
              testId="dashboard-ai-lead-error"
            />
          ) : leadQuality.data && opportunities.data ? (
            <div className="df-metric-panel" data-testid="dashboard-ai-lead-quality">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">
                Qualidade dos leads
              </h2>
              <p className="mt-2 text-sm text-[var(--df-text-secondary)]">
                Prioridade automática a partir do score CRM. Combine com pendências reais no inbox.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCardEnhanced
                  label="High"
                  value={leadQuality.data.high}
                  subHint={
                    opportunities.data.highPending > 0
                      ? `(${opportunities.data.highPending} sem resposta)`
                      : "(nenhuma pendência HIGH)"
                  }
                  hint="Prioridade CRM"
                  emphasis
                />
                <KpiCardEnhanced label="Medium" value={leadQuality.data.medium} hint="Prioridade CRM" />
                <KpiCardEnhanced label="Low" value={leadQuality.data.low} hint="Prioridade CRM" />
                <KpiCardEnhanced
                  label="Score médio"
                  value={leadQuality.data.avgScore}
                  hint="Média nas conversas abertas"
                  tooltip="Score alto = maior chance de fechar. Score baixo = pouco engajamento."
                />
              </div>
            </div>
          ) : leadQuality.data ? (
            <div className="df-metric-panel" data-testid="dashboard-ai-lead-quality">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">
                Qualidade dos leads
              </h2>
              <p className="mt-2 text-sm text-[var(--df-text-secondary)]">
                Prioridade automática a partir do score CRM. Combine com pendências reais no inbox.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCardEnhanced label="High" value={leadQuality.data.high} hint="Prioridade CRM" emphasis />
                <KpiCardEnhanced label="Medium" value={leadQuality.data.medium} hint="Prioridade CRM" />
                <KpiCardEnhanced label="Low" value={leadQuality.data.low} hint="Prioridade CRM" />
                <KpiCardEnhanced
                  label="Score médio"
                  value={leadQuality.data.avgScore}
                  hint="Média nas conversas abertas"
                  tooltip="Score alto = maior chance de fechar. Score baixo = pouco engajamento."
                />
              </div>
            </div>
          ) : null}

          {opportunities.status === "loading" && opportunities.data == null ? (
            <DashboardAiBlockSkeleton heightClass="h-36" testId="dashboard-ai-opportunities-skeleton" />
          ) : opportunities.status === "error" && opportunities.data == null ? (
            <DashboardAiSurfaceError
              title="Oportunidades indisponíveis"
              message={opportunities.error ?? "Não foi possível carregar as oportunidades."}
              onRetry={() => void loadOpportunities()}
              testId="dashboard-ai-opportunities-error"
            />
          ) : opportunities.data ? (
            <div className="df-metric-panel" data-testid="dashboard-ai-opportunities">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">
                Oportunidades
              </h2>
              <p className="mt-2 text-sm text-[var(--df-text-secondary)]">
                Sinais comerciais em tempo real (inbox + automações de follow-up / reativação).
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="df-metric-subcard df-metric-subcard--danger">
                  <p className="df-metric-subcard-label">Leads HIGH sem resposta</p>
                  <p className="df-metric-subcard-value">{opportunities.data.highPending}</p>
                </div>
                <div className="df-metric-subcard">
                  <p className="df-metric-subcard-label">Conversas paradas</p>
                  <p className="df-metric-subcard-value">{opportunities.data.stalled}</p>
                  <p className="df-metric-subcard-hint">Qualificação/negociação sem mensagem há 2h+</p>
                </div>
                <div className="df-metric-subcard df-metric-subcard--success">
                  <p className="df-metric-subcard-label">Em negociação</p>
                  <p className="df-metric-subcard-value">{opportunities.data.negotiating}</p>
                </div>
                <div className="df-metric-subcard df-metric-subcard--info">
                  <p className="df-metric-subcard-label">Reativações na fila</p>
                  <p className="df-metric-subcard-value">{opportunities.data.reactivationQueued}</p>
                </div>
              </div>
            </div>
          ) : null}

          {funnel.status === "loading" && funnel.data == null ? (
            <DashboardAiBlockSkeleton heightClass="h-48" testId="dashboard-ai-funnel-skeleton" />
          ) : funnel.status === "error" ? (
            <DashboardAiSurfaceError
              title="Funil indisponível"
              message={funnel.error ?? "Não foi possível carregar o funil comercial."}
              onRetry={() => void loadFunnel()}
              testId="dashboard-ai-funnel-error"
            />
          ) : funnel.data ? (
            <div className="df-metric-panel" data-testid="dashboard-ai-funnel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">
                  Funil comercial (conversas)
                </h2>
                <FunnelStageLegend />
              </div>
              <p className="mt-2 text-sm text-[var(--df-text-secondary)]">
                <span className="font-semibold text-[var(--df-brand-700)]">{funnel.data.lead}</span> leads
                activos ·{" "}
                <span className="font-semibold text-[var(--df-text-primary)]">
                  {funnel.data.qualifying + funnel.data.negotiating}
                </span>{" "}
                em qualificação/negociação ·{" "}
                <span className="font-semibold text-[var(--df-text-primary)]">{funnel.data.closed}</span>{" "}
                fechados
              </p>
              <div className="mt-4 space-y-3">
                {DASHBOARD_AI_FUNNEL_STAGES.map(({ key, label }) => {
                  const n = funnel.data![key];
                  const max = Math.max(
                    1,
                    funnel.data!.lead +
                      funnel.data!.qualifying +
                      funnel.data!.negotiating +
                      funnel.data!.support +
                      funnel.data!.closed
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
        </div>
      </details>

      {metricsData ? (
        <details
          className="rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_50%,var(--df-bg-elevated))] open:pb-4"
          data-testid="dashboard-ai-extra-event-metrics"
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--df-text-primary)] [&::-webkit-details-marker]:hidden">
            {DASHBOARD_AI_EXTRA_EVENT_METRICS_SUMMARY}
          </summary>
          <div className="border-t df-border-brand px-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {extraEventKpis.map((c) => (
                <KpiCardEnhanced key={c.label} label={c.label} value={c.value} hint={c.hint} />
              ))}
            </div>
          </div>
        </details>
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

      <section className="min-w-0">
        <h2 className="text-sm font-bold text-[var(--df-text-primary)]">Eventos recentes</h2>
        <p className="mt-1 text-xs text-[var(--df-text-muted)]">
          Últimos registos operacionais (tipo, motivo, conversa).
        </p>
        {logs.status === "loading" && logs.data == null ? (
          <div className="mt-4">
            <DashboardAiBlockSkeleton heightClass="h-40" testId="dashboard-ai-logs-skeleton" />
          </div>
        ) : logs.status === "error" && (logs.data == null || logs.data.length === 0) ? (
          <DashboardAiSurfaceError
            title="Eventos indisponíveis"
            message={logs.error ?? "Não foi possível carregar os eventos recentes."}
            onRetry={() => void loadLogs()}
            testId="dashboard-ai-logs-error"
            className="mt-4"
          />
        ) : !logs.data || logs.data.length === 0 ? (
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
                {logs.data.map((row, i) => (
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
                    <td className="px-4 py-3 align-top text-xs text-[var(--df-text-muted)]">
                      {(() => {
                        const href = buildInboxConversationHref(row.conversationId);
                        if (!href || !row.conversationId) {
                          return <span aria-label="Sem conversa associada">—</span>;
                        }
                        const short =
                          row.conversationId.length > 12
                            ? `${row.conversationId.slice(0, 12)}…`
                            : row.conversationId;
                        return (
                          <Link
                            href={href}
                            data-testid="dashboard-ai-event-conversation-link"
                            aria-label={inboxConversationLinkLabel(row.conversationId)}
                            className="break-all font-mono text-[var(--df-brand-700)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--df-brand-500)] focus-visible:ring-offset-2 rounded-sm"
                          >
                            {short}
                          </Link>
                        );
                      })()}
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