"use client";

import { memo } from "react";
import type { InboxSlaLevel, WaInboxThreadRow } from "./inboxTypes";
import { threadNeedsAgentReply } from "./messageOutboundKind";
import { type ConversationState } from "@/modules/inbox/waInboxConversationState";
import { formatCompactWaitDurationMs } from "@/modules/inbox/waInboxSla";
import { conversationPreviewPrefix } from "./conversationPreviewPrefix";
import { slaWaitLabelClass } from "./inboxOperationalStyles";

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
  const showSlaWait = state === "awaiting_agent" && thread.responseDelayMs != null;
  const waitLabel = showSlaWait ? formatCompactWaitDurationMs(thread.responseDelayMs!) : null;
  const isCritical = state === "awaiting_agent" && thread.slaLevel === "critical";
  const isHigh = state === "awaiting_agent" && thread.slaLevel === "high";
  const showActions = Boolean(onAssume || onClose);
  const canAssume = Boolean(onAssume && !thread.isAssignedToMe && thread.status !== "CLOSED");
  const canClose = Boolean(onClose && thread.status !== "CLOSED");
  const showSemDono = Boolean(
    (thread.isUnassigned || !thread.assignedToUser) && thread.status !== "CLOSED"
  );

  const slaRank = (s: InboxSlaLevel | null | undefined): number =>
    s === "critical" ? 0 : s === "high" ? 1 : s === "medium" ? 2 : 3;

  const rowClass = [
    "group relative flex w-full items-stretch border-b border-slate-100/80 transition-[background-color,box-shadow] duration-200 ease-out",
    isCritical
      ? "bg-gradient-to-r from-red-50 via-red-50/95 to-red-50/80 shadow-[inset_4px_0_0_0_rgb(220,38,38),0_0_0_1px_rgba(248,113,113,0.25)]"
      : isHigh
        ? "bg-gradient-to-r from-orange-50/90 to-orange-50/60 shadow-[inset_4px_0_0_0_rgb(234,88,12)]"
        : active
          ? "bg-slate-50/95 shadow-[inset_3px_0_0_0_var(--df-brand-500)]"
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
            <div className="shrink-0 text-right">
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
            </div>
          </div>

          <p className="mt-1 line-clamp-2 text-left text-[12px] leading-snug text-slate-600">
            <span className="font-semibold text-slate-400">{prefix}</span>
            <span className="text-slate-400"> · </span>
            <span>{rawPreview}</span>
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-1">
            {pendingCount > 0 ? (
              <span className="df-badge-pending-count" data-testid="pending-inbound-badge">
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
                Sem dono
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
