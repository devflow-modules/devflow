"use client";

import Link from "next/link";
import { Fragment, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConversationItem } from "./ConversationItem";
import {
  fetchInboxConversations,
  assignConversation,
  updateConversationStatus,
} from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import type { InboxConversationsFilter, WhatsappLineSummary, WaInboxThreadRow } from "./inboxTypes";
import {
  INBOX_SIDEBAR_SECTION_LABELS,
  INBOX_SIDEBAR_SECTION_ORDER,
  threadSidebarSection,
  type InboxSidebarSection,
} from "@/modules/inbox/waInboxConversationState";
import { useInboxRealtime } from "./useInboxRealtime";
import { StateError, StateLoading } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import { FirstConversationHint } from "./FirstConversationHint";
import { InboxFilterEmpty } from "./InboxSidebarEmpty";

const POLL_INTERVAL_REALTIME_MS = 10_000;
const POLL_INTERVAL_FALLBACK_MS = 5_000;

const FILTER_LABELS: Record<InboxConversationsFilter, string> = {
  needs_response: "Precisa resposta",
  mine: "Minhas",
  unassigned: "Sem dono",
  in_attendance: "Em atendimento",
  awaiting_customer: "Aguardando cliente",
  closed: "Fechadas",
};

const FILTER_ORDER: InboxConversationsFilter[] = [
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
  tenantThreadTotal,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: InboxConversationsFilter;
  onFilterChange: (f: InboxConversationsFilter) => void;
  lineFilter: string | null;
  lines: WhatsappLineSummary[];
  onLineFilterChange: (metaPhoneNumberId: string | null) => void;
  /** Total de threads no tenant (sem filtro de fase); usado só para onboarding. */
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

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: INBOX_QK.conversations(filter, lineFilter),
    queryFn: () => fetchInboxConversations(filter, lineFilter),
    refetchInterval: pollInterval,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <StateLoading
          message="A carregar conversas…"
          className="min-h-[10rem] flex-1 rounded-xl border-slate-200/80 py-10 shadow-none"
        />
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

  const threadsBySection = (section: InboxSidebarSection) =>
    sortThreadsForSidebar(threads.filter((t) => threadSidebarSection(t) === section));

  const showOnboardingEmpty =
    tenantThreadTotal === 0 && threads.length === 0 && (lineFilter === null || lineFilter === "");

  if (threads.length === 0) {
    if (showOnboardingEmpty) {
      return (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3" data-testid="conversations-empty">
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-dashed border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white px-4 py-5 shadow-sm">
            <p className="text-center text-sm font-semibold text-slate-900">A aguardar a primeira mensagem</p>
            <p className="mt-1 text-center text-xs text-slate-500">
              A Inbox está ligada — envie um teste do telemóvel e a conversa aparece aqui.
            </p>
            <div className="mt-5 min-h-0 flex-1">
              <FirstConversationHint variant="sidebar" lines={lines} />
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2 border-t border-slate-100 pt-4">
              <Link href="/dashboard/whatsapp" className={buttonClassName("secondary")}>
                Estado da ligação
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return <InboxFilterEmpty onSelectNeedsResponse={() => onFilterChange("needs_response")} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {lines.length > 0 ? (
        <div className="border-b border-slate-100/90 bg-white px-3 py-2">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Número WhatsApp
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-xs text-slate-800"
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
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1 border-b border-slate-100/90 bg-gradient-to-b from-slate-50 to-white px-2 py-2.5">
        {FILTER_ORDER.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            className={`rounded-full px-2 py-1.5 text-[10px] font-semibold transition-[background,color,box-shadow] sm:px-2.5 sm:text-[11px] ${
              filter === f
                ? "bg-[var(--df-brand-600)] text-white shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                : "bg-white/90 text-slate-600 ring-1 ring-slate-200/80 hover:bg-white hover:text-slate-900"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-testid="conversations-list">
        {INBOX_SIDEBAR_SECTION_ORDER.map((section) => {
          const group = threadsBySection(section);
          if (group.length === 0) return null;
          return (
            <Fragment key={section}>
              <div
                className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200/80 bg-slate-50/98 px-3 py-2 backdrop-blur-md sm:px-4"
                data-testid={`inbox-group-${section}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {INBOX_SIDEBAR_SECTION_LABELS[section]}
                </span>
                <span
                  className="inline-flex min-h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-full bg-slate-200/90 px-2 text-[10px] font-bold tabular-nums text-slate-800 ring-1 ring-slate-300/40"
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
                />
              ))}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
