"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchInboxMetrics,
  fetchInboxQueueNext,
  fetchInboxTeam,
  type InboxTeamMember,
} from "./inboxFetch";
import { EmptyState } from "@/components/ui/empty-state";
import { AgentStatusBadge } from "./AgentStatusBadge";
import { Button } from "@/components/ui/button";

function formatDurationSeconds(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 120) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h`;
}

function TeamMemberRow({ m }: { m: InboxTeamMember }) {
  return (
    <div className="flex min-w-0 max-w-[11rem] items-center gap-1">
      <span className="min-w-0 truncate text-[10px] font-medium text-[var(--df-text-primary)]" title={m.name || m.email}>
        {m.name?.trim() || m.email}
      </span>
      <AgentStatusBadge status={m.status} density="compact" className="shrink-0" />
      {m.activeThreadCount > 0 ? (
        <span className="shrink-0 tabular-nums text-[9px] text-[var(--df-text-muted)]">({m.activeThreadCount})</span>
      ) : null}
    </div>
  );
}

type InboxMetricsPanelProps = {
  onOpenThread: (threadId: string) => void;
};

/**
 * Métricas operacionais, equipa e «Assumir próxima».
 */
export function InboxMetricsPanel({ onOpenThread }: InboxMetricsPanelProps) {
  const qc = useQueryClient();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["inbox-operational-metrics", 30],
    queryFn: () => fetchInboxMetrics(30),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const { data: team = [], isLoading: teamLoading } = useQuery({
    queryKey: ["inbox-team-status"],
    queryFn: fetchInboxTeam,
    staleTime: 30_000,
    refetchInterval: 45_000,
  });

  const nextMut = useMutation({
    mutationFn: () => fetchInboxQueueNext(true),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["inbox-conversations"], exact: false });
      void qc.invalidateQueries({ queryKey: ["inbox-operational-metrics"], exact: false });
      void qc.invalidateQueries({ queryKey: ["inbox-team-status"], exact: false });
      if (data.thread?.id) {
        onOpenThread(data.thread.id);
      }
    },
  });

  const totalAssigned = metrics?.conversationsByAgent.reduce((a, x) => a + x.openThreads, 0) ?? null;
  const noMetricSamples =
    metrics && metrics.sampleQueue === 0 && metrics.sampleHandle === 0 && !metricsLoading;

  return (
    <div
      className="flex flex-col gap-1.5 border-b df-border-brand bg-[var(--df-bg-app)]/40 px-3 py-1.5 sm:px-4"
      data-testid="inbox-metrics-panel"
    >
      <div className="grid gap-1.5 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-2">
        <div className="grid gap-1.5 sm:grid-cols-3">
          <div className="rounded-md border df-border-brand bg-[var(--df-bg-elevated)]/90 px-2 py-1.5 shadow-sm">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">Tempo médio em fila</p>
            <p className="mt-0.5 text-base font-bold tabular-nums leading-tight text-[var(--df-text-primary)]">
              {metricsLoading ? "…" : formatDurationSeconds(metrics?.avgQueueWaitSeconds ?? null)}
            </p>
            {metrics && metrics.sampleQueue > 0 ? (
              <p className="mt-0.5 text-[9px] text-[var(--df-text-muted)]">{metrics.sampleQueue} conversas na amostra</p>
            ) : (
              <p className="mt-0.5 text-[9px] text-[var(--df-text-muted)]">Auditoria de atribuições</p>
            )}
          </div>
          <div className="rounded-md border df-border-brand bg-[var(--df-bg-elevated)]/90 px-2 py-1.5 shadow-sm">
            <p className="text-[9px] font-semibold uppercase tracking-wide df-text-muted">
              Tempo médio de atendimento
            </p>
            <p className="mt-0.5 text-base font-bold tabular-nums leading-tight text-[var(--df-text-primary)]">
              {metricsLoading ? "…" : formatDurationSeconds(metrics?.avgHandleSeconds ?? null)}
            </p>
            {metrics && metrics.sampleHandle > 0 ? (
              <p className="mt-0.5 text-[9px] text-[var(--df-text-muted)]">{metrics.sampleHandle} fechos no período</p>
            ) : (
              <p className="mt-0.5 text-[9px] text-[var(--df-text-muted)]">Até ao fecho da conversa</p>
            )}
          </div>
          <div className="rounded-md border df-border-brand bg-[var(--df-bg-elevated)]/90 px-2 py-1.5 shadow-sm">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">Conversas por responsável</p>
            <p className="mt-0.5 text-base font-bold tabular-nums leading-tight text-[var(--df-text-primary)]">
              {metricsLoading ? "…" : totalAssigned ?? "—"}
            </p>
            <p className="mt-0.5 text-[9px] text-[var(--df-text-muted)]">Total em aberto atribuído</p>
          </div>
        </div>
        <Button
          variant="primary"
          type="button"
          disabled={nextMut.isPending}
          className="h-fit shrink-0 self-start px-2.5 py-1.5 text-xs"
          onClick={() => nextMut.mutate()}
          title="Atribui a ti a próxima conversa sem responsável na fila"
          data-testid="inbox-assume-next"
        >
          {nextMut.isPending ? "A abrir…" : "Assumir próxima"}
        </Button>
      </div>

      {noMetricSamples ? (
        <p className="rounded-md border border-dashed df-border-brand bg-[var(--df-bg-elevated)]/60 px-2 py-1 text-[9px] leading-snug text-[var(--df-text-secondary)]">
          Sem dados suficientes para médias ainda — as médias usam o histórico de atribuições e fechos no período.
        </p>
      ) : null}

      {metrics && metrics.conversationsByAgent.length > 0 ? (
        <p
          className="text-[9px] leading-snug text-[var(--df-text-secondary)]"
          title={metrics.conversationsByAgent.map((a) => `${a.name ?? a.userId}: ${a.openThreads}`).join(" · ")}
        >
          <span className="font-medium text-[var(--df-text-muted)]">Conversas por responsável:</span>{" "}
          {metrics.conversationsByAgent.slice(0, 5).map((a, i) => (
            <span key={a.userId}>
              {i > 0 ? " · " : null}
              <span className="text-[var(--df-text-primary)]">{a.name?.trim() ?? a.userId.slice(0, 8)}</span>
              <span className="tabular-nums text-[var(--df-text-muted)]"> ({a.openThreads})</span>
            </span>
          ))}
          {metrics.conversationsByAgent.length > 5 ? <span className="text-[var(--df-text-muted)]"> · …</span> : null}
        </p>
      ) : null}

      {teamLoading ? (
        <p className="text-[10px] text-[var(--df-text-muted)]">A carregar equipa…</p>
      ) : team.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">Equipa</span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-x-2 gap-y-1">
            {team.map((m) => (
              <TeamMemberRow key={m.userId} m={m} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          tone="positive"
          title="Sem estado de equipa"
          description="Os estados Livre, Em atendimento e Offline surgem quando a equipa opera nesta conta."
          className="!py-2 !text-left"
        />
      )}

      {nextMut.isError ? (
        <p className="text-[10px] text-red-600">
          {(nextMut.error as Error)?.message ?? "Não foi possível obter a próxima conversa."}
        </p>
      ) : null}
      {nextMut.isSuccess && nextMut.data?.thread === null ? (
        <EmptyState
          tone="positive"
          title="Fila livre"
          description="Neste momento não há conversas à espera de responsável na fila. Bom trabalho!"
          className="!py-2 !text-left"
        />
      ) : null}
    </div>
  );
}
