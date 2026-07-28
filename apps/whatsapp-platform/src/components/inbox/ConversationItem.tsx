"use client";

import { memo } from "react";
import type { InboxSlaLevel, WaInboxThreadRow } from "./inboxTypes";
import { threadNeedsAgentReply } from "./messageOutboundKind";
import { type ConversationState } from "@/modules/inbox/waInboxConversationState";
import { formatCompactWaitDurationMs } from "@/modules/inbox/waInboxSla";
import { conversationPreviewPrefix } from "./conversationPreviewPrefix";
import { slaWaitLabelClass } from "./inboxOperationalStyles";
import { getResponseAlertLevel } from "./ResponseAlertBadge";
import { getConversationStateBadge } from "./conversationStateUi";
import { Button } from "@/components/ui/button";

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

function slaRank(s: InboxSlaLevel | null | undefined): number {
  return s === "critical" ? 0 : s === "high" ? 1 : s === "medium" ? 2 : 3;
}

/**
 * Fatia 1 — densidade operacional da row.
 * Mantém unread + pending e responsável nomeado (decisões de produto bloqueadas).
 * CRM/score/linha/fila/alertas redundantes saem da lista (header/painel).
 */
export const ConversationItem = memo(function ConversationItem({
  thread,
  active,
  onSelect,
  onAssume,
  onClose,
  busyAction,
  /** Reservado: prospect UI na lista desligada nesta fatia; prop preservada para callers. */
  devFlowProspectingUi: _devFlowProspectingUi = false,
}: {
  thread: WaInboxThreadRow;
  active: boolean;
  onSelect: (id: string) => void;
  onAssume?: (id: string) => void;
  onClose?: (id: string) => void;
  busyAction?: { id: string; kind: "assume" | "close" } | null;
  /** CRM comercial DevFlow (interno) — não renderizado na row densificada. */
  devFlowProspectingUi?: boolean;
}) {
  void _devFlowProspectingUi;

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

  const responseAlert = state === "awaiting_agent" ? getResponseAlertLevel(thread.responseDelayMs) : "none";
  const isCritical =
    state === "awaiting_agent" &&
    (thread.slaLevel === "critical" || responseAlert === "critical");
  const isHigh =
    state === "awaiting_agent" &&
    !isCritical &&
    (thread.slaLevel === "high" || responseAlert === "warning");

  /** SLA na lista = exceção acionável (limiares ResponseAlertBadge / sla high|critical). */
  const showSlaWait =
    state === "awaiting_agent" &&
    thread.responseDelayMs != null &&
    (responseAlert !== "none" || thread.slaLevel === "high" || thread.slaLevel === "critical");
  const waitLabel = showSlaWait ? formatCompactWaitDurationMs(thread.responseDelayMs!) : null;

  const showActions = Boolean(onAssume || onClose);
  const isUnassigned = thread.isUnassigned ?? thread.assignedToUser == null;
  const canAssume = Boolean(onAssume && thread.status !== "CLOSED" && isUnassigned);
  const canClose = Boolean(onClose && thread.status !== "CLOSED");
  const showSemDono = Boolean(
    (thread.isUnassigned || !thread.assignedToUser) &&
      thread.status !== "CLOSED" &&
      state === "awaiting_agent"
  );

  const legacyNeedsReply = Boolean(needsReply && thread.status === "OPEN" && !state);

  const noOwnerStripe =
    showSemDono && !isCritical && !isHigh && !active
      ? "bg-[var(--df-warning-bg)] shadow-[inset_3px_0_0_0_rgb(217,119,6)]"
      : null;

  const rowClass = [
    "group relative flex w-full items-stretch border-b df-border-brand transition-[background-color,box-shadow] duration-200 ease-out",
    isCritical
      ? "bg-[color-mix(in_srgb,var(--df-danger-sla-bg)_92%,var(--df-bg-elevated))] shadow-[inset_4px_0_0_0_var(--df-danger-sla-border)] ring-1 ring-[color:var(--df-danger-border)] ring-inset"
      : isHigh
        ? "bg-[color-mix(in_srgb,var(--df-warning-bg)_85%,var(--df-bg-elevated))] shadow-[inset_4px_0_0_0_var(--df-warning-border)]"
        : noOwnerStripe
          ? `${noOwnerStripe} hover:bg-[color-mix(in_srgb,var(--df-warning-bg)_45%,transparent)]`
          : active
            ? "bg-muted/60/95 shadow-[inset_4px_0_0_0_var(--df-brand-500)] ring-2 ring-[var(--df-brand-500)]/25 ring-inset"
            : thread.status === "CLOSED"
              ? "border-b-[color:color-mix(in_srgb,var(--df-border-dark)_70%,var(--df-border-subtle))] bg-[color-mix(in_srgb,var(--df-bg-app)_26%,var(--df-bg-elevated))] hover:bg-[color-mix(in_srgb,var(--df-brand-100)_34%,var(--df-bg-elevated))] hover:shadow-[0_2px_14px_rgba(0,0,0,0.22)] active:bg-[color-mix(in_srgb,var(--df-brand-50)_42%,var(--df-bg-elevated))]"
              : "bg-[var(--df-bg-elevated)] hover:bg-[var(--df-brand-100)] hover:shadow-[0_1px_4px_rgba(15,23,42,0.06)] active:bg-[var(--df-brand-50)]",
  ].join(" ");

  const avatarClass = isCritical
    ? "bg-[color:var(--df-danger-bg)] df-text-error ring-2 ring-[color:var(--df-danger-border)]"
    : isHigh
      ? "bg-[color-mix(in_srgb,var(--df-warning-bg)_75%,var(--df-bg-elevated))] df-text-warning ring-1 ring-[color:var(--df-warning-border)]"
      : active
        ? "bg-[var(--df-brand-600)] text-white shadow-sm ring-0"
        : "bg-[var(--df-brand-100)] text-[var(--df-brand-900)] ring-1 ring-[var(--df-border-subtle)]";

  return (
    <div className={rowClass} data-thread-id={thread.id}>
      <Button
        variant="secondary"
        type="button"
        onClick={() => onSelect(thread.id)}
        data-testid="conversation-item"
        className={`df-focus-brand flex min-w-0 flex-1 items-start gap-2.5 px-2 text-left sm:gap-3 sm:px-2.5 max-md:px-3 max-md:py-3 ${
          thread.status === "CLOSED" ? "py-3.5 sm:py-4" : "py-2.5 sm:py-2.5"
        }`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-tight transition-transform duration-200 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${avatarClass}`}
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1 pr-1">
          {/* Faixa 1 — identidade + tempo/SLA-exceção + unread */}
          <div className="flex min-w-0 items-start justify-between gap-2">
            <span className="truncate text-[13px] font-semibold leading-tight text-[var(--df-text-primary)]">
              {title}
            </span>
            <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
              {waitLabel ? (
                <span
                  className={`inline-flex items-center tabular-nums ${slaWaitLabelClass(isCritical, isHigh)}`}
                  data-testid="sla-wait-label"
                  data-sla-rank={slaRank(thread.slaLevel)}
                >
                  {waitLabel}
                </span>
              ) : (
                <span className="text-[11px] tabular-nums text-[var(--df-text-muted)]">
                  {formatListTimeCompact(thread.lastMessageAt)}
                </span>
              )}
              {thread.unreadCount > 0 ? (
                <span
                  className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--df-brand-700)] px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums shadow-sm"
                  title="Mensagens não lidas"
                  data-testid="unread-count-badge"
                >
                  {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                </span>
              ) : null}
            </div>
          </div>

          {/* Faixa 2 — prévia */}
          <p className="mt-1 line-clamp-2 text-left text-[12px] leading-snug text-[var(--df-text-secondary)]">
            <span className="font-semibold text-[var(--df-text-muted)]">{prefix}</span>
            <span className="text-[var(--df-text-muted)]"> · </span>
            <span>{rawPreview}</span>
          </p>

          {/* Faixa 3 — estado dominante + responsável (comportamento atual) + pending */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {stateBadge ? (
              <span className={stateBadge.className} data-testid="conversation-state-badge">
                {stateBadge.label}
              </span>
            ) : legacyNeedsReply ? (
              <span className="df-chip-awaiting" data-testid="conversation-state-badge">
                Precisa resposta
              </span>
            ) : null}
            {pendingCount > 0 ? (
              <span
                className="df-badge-pending-count"
                data-testid="pending-inbound-badge"
                title="Inbounds sem resposta"
              >
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            ) : null}
          </div>

          {assigneeLabel ? (
            <p
              className="mt-1 truncate text-left text-[10px] font-medium text-[var(--df-text-muted)]"
              data-testid="assignee-line"
            >
              Responsável: <span className="text-[var(--df-text-secondary)]">{assigneeLabel}</span>
            </p>
          ) : null}
        </div>
      </Button>

      {showActions && (canAssume || canClose) ? (
        <div
          className="df-inbox-row-actions"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {canAssume ? (
            <Button
              variant="disabled"
              type="button"
              disabled={busyAction?.id === thread.id}
              className="df-inbox-row-action-primary max-md:min-h-10"
              onClick={() => onAssume?.(thread.id)}
              data-testid="action-assume"
            >
              {busyAction?.id === thread.id && busyAction.kind === "assume" ? "…" : "Assumir"}
            </Button>
          ) : null}
          {canClose ? (
            <Button
              variant="disabled"
              type="button"
              disabled={busyAction?.id === thread.id}
              className="df-inbox-row-action-secondary max-md:min-h-10"
              onClick={() => onClose?.(thread.id)}
              data-testid="action-close"
            >
              {busyAction?.id === thread.id && busyAction.kind === "close" ? "…" : "Fechar"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
