"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConversationItem } from "./ConversationItem";
import {
  fetchInboxConversations,
  assignConversation,
  updateConversationStatus,
} from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import type {
  InboxConversationsFilter,
  InboxProspectLens,
  WhatsappLineSummary,
  WaInboxThreadRow,
} from "./inboxTypes";
import type { InboxProspectMetricsRow } from "@/modules/inbox/waInboxProspectMetrics";
import { InboxProspectMetricsBar } from "./InboxProspectMetricsBar";
import type { InboxQueueOption } from "./inboxFetch";
import {
  INBOX_SIDEBAR_SECTION_LABELS,
  INBOX_SIDEBAR_SECTION_ORDER,
  threadSidebarSection,
  type InboxSidebarSection,
} from "@/modules/inbox/waInboxConversationState";
import { useInboxRealtime } from "./useInboxRealtime";
import { StateError } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import { FirstConversationHint } from "./FirstConversationHint";
import { InboxFilterEmpty } from "./InboxSidebarEmpty";
import { getResponseAlertLevel } from "./ResponseAlertBadge";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_REALTIME_MS = 10_000;
const POLL_INTERVAL_FALLBACK_MS = 5_000;

const FILTER_LABELS: Record<InboxConversationsFilter, string> = {
  all: "Todas",
  needs_response: "Precisa resposta",
  mine: "Minhas",
  unassigned: "Sem responsável",
  in_attendance: "Em atendimento",
  awaiting_customer: "Aguardando cliente",
  closed: "Fechadas",
};

const FILTER_ORDER: InboxConversationsFilter[] = [
  "all",
  "needs_response",
  "mine",
  "unassigned",
  "in_attendance",
  "awaiting_customer",
  "closed",
];

function sortThreadsForSidebar(threads: WaInboxThreadRow[]): WaInboxThreadRow[] {
  return [...threads].sort((a, b) => {
    const rankSla = (s: WaInboxThreadRow["slaLevel"]) =>
      s === "critical" ? 0 : s === "high" ? 1 : s === "medium" ? 2 : 3;
    const ra = rankSla(a.slaLevel ?? null);
    const rb = rankSla(b.slaLevel ?? null);
    if (ra !== rb) return ra - rb;
    const da = a.responseDelayMs ?? 0;
    const db = b.responseDelayMs ?? 0;
    if (da !== db) return db - da;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });
}

export function ConversationsList({
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  lineFilter,
  lines,
  onLineFilterChange,
  queueFilter,
  queues,
  onQueueFilterChange,
  priorityFilter,
  prospectLens,
  onProspectLensChange,
  prospectMetrics,
  prospectUiEnabled = false,
  tenantThreadTotal,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: InboxConversationsFilter;
  onFilterChange: (f: InboxConversationsFilter) => void;
  lineFilter: string | null;
  lines: WhatsappLineSummary[];
  onLineFilterChange: (metaPhoneNumberId: string | null) => void;
  queueFilter: string | null;
  queues: InboxQueueOption[];
  onQueueFilterChange: (queueId: string | null) => void;
  /** Prioridade CRM (LOW | MEDIUM | HIGH); alinhado com query `priority` da API. */
  priorityFilter?: string | null;
  prospectLens?: InboxProspectLens | null;
  onProspectLensChange?: (lens: InboxProspectLens | null) => void;
  prospectMetrics?: InboxProspectMetricsRow;
  /** CRM DevFlow interno: métricas, filtros prospectLens e chips comerciais na lista. */
  prospectUiEnabled?: boolean;
  /** Total de conversas no espaço (sem filtro de fase); usado só para onboarding. */
  tenantThreadTotal?: number;
}) {
  const qc = useQueryClient();
  const { connected: realtimeConnected } = useInboxRealtime();
  const pollInterval = realtimeConnected ? POLL_INTERVAL_REALTIME_MS : POLL_INTERVAL_FALLBACK_MS;

  const invalidateConversations = () =>
    void qc.invalidateQueries({ queryKey: ["inbox-conversations"], exact: false });

  const assumeMut = useMutation({
    mutationFn: (threadId: string) => assignConversation(threadId, "me"),
    onSettled: invalidateConversations,
  });
  const closeMut = useMutation({
    mutationFn: (threadId: string) => updateConversationStatus(threadId, "CLOSED"),
    onSettled: invalidateConversations,
  });

  const busyAction = useMemo(() => {
    if (assumeMut.isPending && assumeMut.variables != null) {
      return { id: assumeMut.variables, kind: "assume" as const };
    }
    if (closeMut.isPending && closeMut.variables != null) {
      return { id: closeMut.variables, kind: "close" as const };
    }
    return null;
  }, [assumeMut.isPending, assumeMut.variables, closeMut.isPending, closeMut.variables]);

  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const moreFiltersRef = useRef<HTMLDivElement>(null);
  const hasLineFilter = Boolean(lineFilter);
  const hasSecondaryRefinement = hasLineFilter || queueFilter !== null;

  useEffect(() => {
    if (!moreFiltersOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreFiltersRef.current && !moreFiltersRef.current.contains(e.target as Node)) {
        setMoreFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreFiltersOpen]);

  const effectiveProspectLens = prospectUiEnabled ? (prospectLens ?? null) : null;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: INBOX_QK.conversations(
      filter,
      lineFilter,
      queueFilter,
      priorityFilter ?? null,
      effectiveProspectLens
    ),
    queryFn: () =>
      fetchInboxConversations(
        filter,
        lineFilter,
        queueFilter,
        priorityFilter ?? null,
        effectiveProspectLens
      ),
    refetchInterval: pollInterval,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-3" data-testid="conversations-list-skeleton">
        <div className="space-y-2 rounded-xl border df-border-brand bg-[var(--df-bg-elevated)]/90 p-3 shadow-sm">
          <div className="h-8 w-3/5 max-w-[12rem] animate-pulse rounded-lg bg-muted/80" />
          <div className="h-8 w-full animate-pulse rounded-lg bg-muted/90" />
          <div className="h-8 w-full animate-pulse rounded-lg bg-muted/90" />
          <div className="h-8 w-4/5 animate-pulse rounded-lg bg-muted/90" />
          <div className="h-8 w-full animate-pulse rounded-lg bg-muted/90" />
          <p className="pt-2 text-center text-[11px] font-medium df-text-muted">A carregar conversas…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <StateError
          title="Não foi possível carregar as conversas"
          message={error instanceof Error ? error.message : "Tente outra vez dentro de momentos."}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const threads = data?.threads ?? [];

  const awaiting = threads.filter((t) => t.conversationState === "awaiting_agent");
  const responseAlertCriticalCount = awaiting.filter(
    (t) => getResponseAlertLevel(t.responseDelayMs) === "critical"
  ).length;
  const responseAlertWarningCount = awaiting.filter(
    (t) => getResponseAlertLevel(t.responseDelayMs) === "warning"
  ).length;

  const threadsBySection = (section: InboxSidebarSection) =>
    sortThreadsForSidebar(threads.filter((t) => threadSidebarSection(t) === section));

  const showOnboardingEmpty =
    tenantThreadTotal === 0 &&
    threads.length === 0 &&
    (lineFilter === null || lineFilter === "") &&
    queueFilter === null;

  const showRefinementRow = queues.length > 0 || lines.length > 0;

  const filterChrome = (
    <>
      {prospectUiEnabled && onProspectLensChange ? (
        <InboxProspectMetricsBar
          metrics={prospectMetrics}
          activeLens={prospectLens ?? null}
          onLensChange={onProspectLensChange}
        />
      ) : null}
      <div className="flex flex-wrap gap-1.5 border-b df-border-brand bg-[var(--df-bg-elevated)] px-2 py-2.5">
        {FILTER_ORDER.map((f) => {
          const isNeeds = f === "needs_response";
          const selected = filter === f;
          return (
            <Button variant="secondary"
              key={f}
              type="button"
              onClick={() => onFilterChange(f)}
              data-testid={`inbox-filter-${f}`}
              className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold transition-[background,color,box-shadow,ring] sm:text-[11px] ${
                selected && isNeeds
                  ? "bg-red-600 text-white shadow-md ring-2 ring-red-400/60"
                  : selected
                    ? "bg-[var(--df-brand-600)] text-white shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                    : isNeeds
                      ? "bg-red-50/95 text-red-900 ring-1 ring-red-200/90 hover:bg-red-100"
                      : "bg-[var(--df-bg-elevated)] text-[var(--df-text-secondary)] ring-1 ring-[var(--df-border-subtle)] hover:bg-[var(--df-brand-100)] hover:text-[var(--df-text-primary)]"
              }`}
            >
              {FILTER_LABELS[f]}
            </Button>
          );
        })}
      </div>

      {showRefinementRow ? (
        <div className="flex flex-wrap items-center gap-2 border-b df-border-brand bg-[var(--df-bg-elevated)] px-2 py-2">
          {queues.length > 0 ? (
            <div className="flex min-w-0 max-w-[min(100%,18rem)] flex-1 items-center gap-1.5">
                <span className="shrink-0 text-[10px] font-medium text-[var(--df-text-secondary)]">Fila</span>
              <select
                className="min-w-0 flex-1 rounded-lg border df-border-brand bg-[var(--df-bg-app)] px-2 py-1.5 text-[11px] text-[var(--df-text-primary)]"
                aria-label="Filtrar por fila"
                value={queueFilter === "none" ? "__none__" : queueFilter ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") onQueueFilterChange(null);
                  else if (v === "__none__") onQueueFilterChange("none");
                  else onQueueFilterChange(v);
                }}
              >
                <option value="">Todas</option>
                <option value="__none__">Sem fila</option>
                {queues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {lines.length > 0 ? (
            <div ref={moreFiltersRef} className="relative flex items-center gap-1.5">
              <Button variant="secondary"
                type="button"
                onClick={() => setMoreFiltersOpen((o) => !o)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  hasLineFilter
                    ? "border-[var(--df-brand-500)]/40 bg-[var(--df-brand-50)] text-[var(--df-brand-800)]"
                    : "border-[var(--df-border-subtle)] bg-[var(--df-bg-elevated)] text-[var(--df-text-secondary)] hover:bg-[var(--df-brand-100)]"
                }`}
                aria-expanded={moreFiltersOpen}
                aria-controls="inbox-more-filters"
              >
                Mais filtros
                {hasLineFilter ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--df-brand-500)]" aria-hidden />
                ) : null}
              </Button>
              {moreFiltersOpen ? (
                <div
                  id="inbox-more-filters"
                  className="absolute left-0 top-full z-30 mt-1 w-[min(calc(100vw-2rem),18rem)] rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] p-3 shadow-lg ring-1 ring-black/30"
                >
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">
                    Linha WhatsApp
                  </label>
                  <select
                    className="w-full rounded-lg border df-border-brand bg-[var(--df-bg-app)] px-2 py-1.5 text-xs text-[var(--df-text-primary)]"
                    value={lineFilter ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onLineFilterChange(v === "" ? null : v);
                    }}
                  >
                    <option value="">Todos os números</option>
                    {lines.map((l) => (
                      <option key={l.phoneNumberId} value={l.phoneNumberId}>
                        {l.label?.trim() ||
                          l.displayPhoneNumber?.trim() ||
                          l.phoneNumberId.slice(0, 12) + "…"}
                        {l.isPrimary ? " · Principal" : ""}
                        {l.isDefaultOutbound ? " · Envio" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[10px] leading-snug text-[var(--df-text-muted)]">
                    Use a linha quando tiver vários números Business; a fila fica no controlo ao lado.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (threads.length === 0) {
    if (showOnboardingEmpty) {
      return (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3" data-testid="conversations-empty">
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-dashed df-border-brand bg-gradient-to-b from-[var(--df-bg-elevated)] to-[var(--df-bg-app)] px-4 py-5 shadow-sm">
            <p className="text-center text-sm font-semibold text-[var(--df-text-primary)]">Aguardando sua primeira mensagem</p>
            <p className="mt-1 text-center text-xs text-[var(--df-text-secondary)]">
              Envie uma mensagem para seu número para testar o atendimento.
            </p>
            <div className="mt-5 min-h-0 flex-1">
              <FirstConversationHint variant="sidebar" lines={lines} />
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2 border-t df-border-brand pt-4">
              <Link href="/dashboard/whatsapp" className={buttonClassName("secondary")}>
                Estado da ligação
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {filterChrome}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-testid="conversations-empty">
          <InboxFilterEmpty
            filter={filter}
            hasSecondaryRefinement={hasSecondaryRefinement}
            onSelectNeedsResponse={() => onFilterChange("needs_response")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {filterChrome}
      {responseAlertCriticalCount > 0 ? (
        <div
          className="border-b border-red-200/90 bg-red-50/95 px-3 py-2 text-[11px] leading-snug text-red-950 sm:px-4"
          role="alert"
          data-testid="inbox-stale-alert-critical"
        >
          <strong className="font-semibold">Crítico:</strong>{" "}
          {responseAlertCriticalCount === 1
            ? "1 conversa à espera há mais de 10 minutos."
            : `${responseAlertCriticalCount} conversas à espera há mais de 10 minutos.`}
        </div>
      ) : responseAlertWarningCount > 0 ? (
        <div
          className="border-b border-amber-200/90 bg-amber-50/95 px-3 py-2 text-[11px] leading-snug text-amber-950 sm:px-4"
          role="status"
          data-testid="inbox-stale-alert-warning"
        >
          <strong className="font-semibold">Atenção:</strong>{" "}
          {responseAlertWarningCount === 1
            ? "1 conversa à espera há mais de 5 minutos."
            : `${responseAlertWarningCount} conversas à espera há mais de 5 minutos.`}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-testid="conversations-list">
        {INBOX_SIDEBAR_SECTION_ORDER.map((section) => {
          const group = threadsBySection(section);
          if (group.length === 0) return null;
          return (
            <Fragment key={section}>
              <div
                className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b df-border-brand bg-[var(--df-bg-elevated)]/95 px-3 py-2 backdrop-blur-md sm:px-4"
                data-testid={`inbox-group-${section}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--df-text-secondary)]">
                  {INBOX_SIDEBAR_SECTION_LABELS[section]}
                </span>
                <span
                  className="inline-flex min-h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-full bg-[var(--df-brand-100)] px-2 text-[10px] font-bold tabular-nums text-[var(--df-brand-900)] ring-1 ring-[var(--df-border-subtle)]"
                  data-testid={`inbox-group-count-${section}`}
                >
                  {group.length}
                </span>
              </div>
              {group.map((t) => (
                <ConversationItem
                  key={t.id}
                  thread={t}
                  active={t.id === selectedId}
                  onSelect={onSelect}
                  onAssume={(id) => assumeMut.mutate(id)}
                  onClose={(id) => closeMut.mutate(id)}
                  busyAction={busyAction}
                  devFlowProspectingUi={prospectUiEnabled}
                />
              ))}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
