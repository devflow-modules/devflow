"use client";

import { memo } from "react";
import type { InboxSlaLevel, WaInboxThreadRow } from "./inboxTypes";
import { threadNeedsAgentReply } from "./messageOutboundKind";
import { type ConversationState } from "@/modules/inbox/waInboxConversationState";
import { formatCompactWaitDurationMs } from "@/modules/inbox/waInboxSla";
import { conversationPreviewPrefix } from "./conversationPreviewPrefix";
import { slaWaitLabelClass } from "./inboxOperationalStyles";
import { priorityGuidance } from "./leadPanelCopy";
import { ResponseAlertBadge, getResponseAlertLevel } from "./ResponseAlertBadge";
import { getConversationStateBadge } from "./conversationStateUi";

function formatListTimeCompact(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "agora";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 48) return `${h}h`;
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

export const ConversationItem = memo(function ConversationItem({
  thread,
  active,
  onSelect,
  onAssume,
  onClose,
  busyAction,
}: {
  thread: WaInboxThreadRow;
  active: boolean;
  onSelect: (id: string) => void;
  onAssume?: (id: string) => void;
  onClose?: (id: string) => void;
  busyAction?: { id: string; kind: "assume" | "close" } | null;
}) {
  const title = thread.contactName?.trim() || thread.phoneNumber;
  const initials = title.slice(0, 2).toUpperCase();
  const rawPreview = thread.lastMessagePreview?.trim() || "—";
  const prefix = conversationPreviewPrefix(thread);
  const needsReply = threadNeedsAgentReply(thread);
  const pendingCount = thread.unansweredInboundCount ?? 0;
  const state = thread.conversationState as ConversationState | undefined;
  const stateBadge = getConversationStateBadge(state);
  const assigneeLabel =
    thread.status === "CLOSED"
      ? null
      : thread.assignedToUser?.name?.trim() || "Sem responsável";
  const showSlaWait = state === "awaiting_agent" && thread.responseDelayMs != null;
  const waitLabel = showSlaWait ? formatCompactWaitDurationMs(thread.responseDelayMs!) : null;
  const responseAlert = state === "awaiting_agent" ? getResponseAlertLevel(thread.responseDelayMs) : "none";
  const isCritical =
    state === "awaiting_agent" &&
    (thread.slaLevel === "critical" || responseAlert === "critical");
  const isHigh =
    state === "awaiting_agent" &&
    !isCritical &&
    (thread.slaLevel === "high" || responseAlert === "warning");
  const showActions = Boolean(onAssume || onClose);
  const canAssume = Boolean(onAssume && !thread.isAssignedToMe && thread.status !== "CLOSED");
  const canClose = Boolean(onClose && thread.status !== "CLOSED");
  /** Sem responsável humano: pendência inbound e ninguém atribuído. */
  const showSemDono = Boolean(
    (thread.isUnassigned || !thread.assignedToUser) &&
      thread.status !== "CLOSED" &&
      state === "awaiting_agent"
  );
  const showAguardandoCliente = Boolean(
    (thread.isUnassigned || !thread.assignedToUser) &&
      thread.status !== "CLOSED" &&
      state === "awaiting_customer"
  );

  const crmTier = thread.priority;
  const crmLabel =
    crmTier === "HIGH"
      ? "Prioridade alta"
      : crmTier === "MEDIUM"
        ? "Prioridade média"
        : crmTier === "LOW"
          ? "Prioridade baixa"
          : null;
  const priorityHint = priorityGuidance(crmTier);
  const crmClass =
    crmTier === "HIGH"
      ? "text-red-600 ring-red-200/60"
      : crmTier === "MEDIUM"
        ? "text-amber-700 ring-amber-200/70"
        : crmTier === "LOW"
          ? "text-slate-500 ring-slate-200/80"
          : "";

  const slaRank = (s: InboxSlaLevel | null | undefined): number =>
    s === "critical" ? 0 : s === "high" ? 1 : s === "medium" ? 2 : 3;

  const noOwnerStripe =
    showSemDono && !isCritical && !isHigh && !active
      ? "bg-amber-50/40 shadow-[inset_3px_0_0_0_rgb(217,119,6)]"
      : null;

  const rowClass = [
    "group relative flex w-full items-stretch border-b border-slate-100/80 transition-[background-color,box-shadow] duration-200 ease-out",
    isCritical
      ? "bg-gradient-to-r from-red-50 via-red-50/95 to-red-50/80 shadow-[inset_4px_0_0_0_rgb(220,38,38),0_0_0_1px_rgba(248,113,113,0.25)]"
      : isHigh
        ? "bg-gradient-to-r from-orange-50/90 to-orange-50/60 shadow-[inset_4px_0_0_0_rgb(234,88,12)]"
        : noOwnerStripe
          ? `${noOwnerStripe} hover:bg-amber-50/55`
          : active
            ? "bg-slate-50/95 shadow-[inset_4px_0_0_0_var(--df-brand-500)] ring-2 ring-[var(--df-brand-500)]/25 ring-inset"
            : "bg-white hover:bg-slate-50/90",
  ].join(" ");

  const avatarClass = isCritical
    ? "bg-red-100 text-red-900 ring-2 ring-red-200/80"
    : isHigh
      ? "bg-orange-100 text-orange-950 ring-1 ring-orange-200/80"
      : active
        ? "bg-[var(--df-brand-600)] text-white shadow-sm ring-0"
        : "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80";

  return (
    <div className={rowClass} data-thread-id={thread.id}>
      <button
        type="button"
        onClick={() => onSelect(thread.id)}
        data-testid="conversation-item"
        className="flex min-w-0 flex-1 items-start gap-2.5 px-2 py-2.5 text-left sm:gap-3 sm:px-2.5 sm:py-2.5"
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-tight transition-transform duration-200 ease-out group-hover:scale-[1.02] ${avatarClass}`}
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1 pr-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <span
              className={`truncate text-[13px] font-semibold leading-tight ${active ? "text-slate-950" : "text-slate-900"}`}
            >
              {title}
            </span>
            <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
              {state === "awaiting_agent" && waitLabel ? (
                <span
                  className={`inline-flex items-center tabular-nums ${slaWaitLabelClass(isCritical, isHigh)}`}
                  data-testid="sla-wait-label"
                  data-sla-rank={slaRank(thread.slaLevel)}
                >
                  {waitLabel}
                </span>
              ) : (
                <span className="text-[11px] tabular-nums text-slate-400">{formatListTimeCompact(thread.lastMessageAt)}</span>
              )}
              {thread.unreadCount > 0 ? (
                <span
                  className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums shadow-sm"
                  title="Mensagens não lidas"
                  data-testid="unread-count-badge"
                >
                  {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                </span>
              ) : null}
            </div>
          </div>

          {stateBadge ? (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className={stateBadge.className} data-testid="conversation-state-badge">
                {stateBadge.label}
              </span>
            </div>
          ) : null}

          {assigneeLabel ? (
            <p className="mt-0.5 truncate text-left text-[10px] font-medium text-slate-500" data-testid="assignee-line">
              Responsável: <span className="text-slate-700">{assigneeLabel}</span>
            </p>
          ) : null}

          <p className="mt-1 line-clamp-2 text-left text-[12px] leading-snug text-slate-600">
            <span className="font-semibold text-slate-400">{prefix}</span>
            <span className="text-slate-400"> · </span>
            <span>{rawPreview}</span>
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-1.5" data-testid="crm-inbox-row">
            {crmLabel ? (
              <span
                className={`inline-flex flex-col rounded px-1 py-0.5 text-[9px] font-bold ring-1 ${crmClass}`}
                title={priorityHint?.tooltip ?? "Prioridade da conversa"}
                data-testid="crm-priority-badge"
              >
                <span>{crmLabel}</span>
                {priorityHint ? (
                  <span className="font-normal normal-case opacity-90">{priorityHint.line}</span>
                ) : null}
              </span>
            ) : null}
            <span className="tabular-nums text-[9px] font-semibold text-slate-600" data-testid="lead-score-list">
              {thread.leadScore ?? 0} pts
            </span>
            {thread.aiState ? (
              <span className="max-w-[5.5rem] truncate rounded bg-slate-100 px-1 py-0.5 text-[9px] font-medium text-slate-700 ring-1 ring-slate-200/80">
                {thread.aiState}
              </span>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1">
            {state === "awaiting_agent" && responseAlert !== "none" ? (
              <ResponseAlertBadge delayMs={thread.responseDelayMs} />
            ) : null}
            {pendingCount > 0 ? (
              <span className="df-badge-pending-count" data-testid="pending-inbound-badge" title="Inbounds sem resposta">
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            ) : null}
            {thread.queue?.name ? (
              <span
                className="max-w-[7rem] truncate rounded-md px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-slate-200/80"
                style={{
                  backgroundColor: thread.queue.color ? `${thread.queue.color}33` : "rgb(241 245 249)",
                }}
                title={thread.queue.slug}
              >
                {thread.queue.name}
              </span>
            ) : null}
            {showSemDono ? (
              <span className="df-chip-unassigned" data-testid="unassigned-chip">
                Sem responsável
              </span>
            ) : null}
            {showAguardandoCliente ? (
              <span
                className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-900 ring-1 ring-emerald-200/80"
                data-testid="awaiting-customer-chip"
                title="Última resposta enviada; à espera do cliente"
              >
                {thread.lastResponderType === "ai" ? "IA · aguarda cliente" : "Aguardando cliente"}
              </span>
            ) : null}
            {needsReply && thread.status === "OPEN" && !state && <span className="df-chip-awaiting">À espera</span>}
          </div>
        </div>
      </button>

      {showActions && (canAssume || canClose) ? (
        <div
          className="pointer-events-none absolute right-2 top-1/2 z-[2] flex -translate-y-1/2 translate-x-1 flex-col gap-1 opacity-0 shadow-sm transition-all duration-200 ease-out group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {canAssume ? (
            <button
              type="button"
              disabled={busyAction?.id === thread.id}
              className="df-inbox-row-action-primary"
              onClick={() => onAssume?.(thread.id)}
              data-testid="action-assume"
            >
              {busyAction?.id === thread.id && busyAction.kind === "assume" ? "…" : "Assumir"}
            </button>
          ) : null}
          {canClose ? (
            <button
              type="button"
              disabled={busyAction?.id === thread.id}
              className="df-inbox-row-action-secondary"
              onClick={() => onClose?.(thread.id)}
              data-testid="action-close"
            >
              {busyAction?.id === thread.id && busyAction.kind === "close" ? "…" : "Fechar"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
