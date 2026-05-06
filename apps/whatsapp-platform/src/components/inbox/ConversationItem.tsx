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
import { Button } from "@/components/ui/button";
import {
  formatWhatsappLineBadgeLabel,
  formatWhatsappLineFilterOptionLabel,
  getWhatsappLinePurposeTone,
} from "@/lib/whatsapp-lines/linePresentation";
import {
  isFollowUpDueOrOverdue,
  isSalesStage,
  SALES_STAGE_ABBREV,
  SALES_STAGE_BADGE_CLASS,
  SALES_STAGE_LABELS_PT,
} from "@/modules/inbox/prospectSales";

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
  devFlowProspectingUi = false,
}: {
  thread: WaInboxThreadRow;
  active: boolean;
  onSelect: (id: string) => void;
  onAssume?: (id: string) => void;
  onClose?: (id: string) => void;
  busyAction?: { id: string; kind: "assume" | "close" } | null;
  /** CRM comercial DevFlow (interno): etapa + FU hoje na linha. */
  devFlowProspectingUi?: boolean;
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
      ? "Prioridade CRM — alta"
      : crmTier === "MEDIUM"
        ? "Prioridade CRM — média"
        : crmTier === "LOW"
          ? "Prioridade CRM — baixa"
          : null;
  const priorityHint = priorityGuidance(crmTier);
  const crmClass =
    crmTier === "HIGH"
      ? "df-text-error ring-1 ring-[color:var(--df-danger-border)]"
      : crmTier === "MEDIUM"
        ? "df-text-warning ring-1 ring-[color:var(--df-warning-border)]"
        : crmTier === "LOW"
          ? "df-text-muted ring-1 ring-[color:var(--df-ring-soft)]"
          : "";

  const slaRank = (s: InboxSlaLevel | null | undefined): number =>
    s === "critical" ? 0 : s === "high" ? 1 : s === "medium" ? 2 : 3;

  const followUpDue = isFollowUpDueOrOverdue(thread.leadData?.prospect?.nextFollowUpAt);
  const prospectStage = thread.leadData?.prospect?.salesStage;
  const stageChip =
    prospectStage && isSalesStage(prospectStage) ? (
      <span
        className={`max-w-[4.5rem] truncate rounded px-1 py-0.5 text-[9px] font-bold ring-1 ${SALES_STAGE_BADGE_CLASS[prospectStage]}`}
        title={SALES_STAGE_LABELS_PT[prospectStage]}
      >
        {SALES_STAGE_ABBREV[prospectStage]}
      </span>
    ) : null;

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
      <Button variant="secondary"
        type="button"
        onClick={() => onSelect(thread.id)}
        data-testid="conversation-item"
        className={`flex min-w-0 flex-1 items-start gap-2.5 px-2 text-left sm:gap-3 sm:px-2.5 ${
          thread.status === "CLOSED" ? "py-3.5 sm:py-4" : "py-2.5 sm:py-2.5"
        }`}
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
              className={`truncate text-[13px] font-semibold leading-tight ${active ? "text-[var(--df-text-primary)]" : "text-[var(--df-text-primary)]"}`}
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
                <span className="text-[11px] tabular-nums text-[var(--df-text-muted)]">{formatListTimeCompact(thread.lastMessageAt)}</span>
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

          {thread.whatsappLine ? (
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5" data-testid="conversation-line-badge-row">
              <span
                className={getWhatsappLinePurposeTone(thread.whatsappLine).className}
                data-testid="whatsapp-line-badge"
                title={formatWhatsappLineFilterOptionLabel(thread.whatsappLine)}
              >
                {formatWhatsappLineBadgeLabel(thread.whatsappLine)}
              </span>
            </div>
          ) : null}

          {stateBadge || (thread.dealSuggested && thread.dealStatus !== "won" && thread.dealStatus !== "lost") ? (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {stateBadge ? (
                <span className={stateBadge.className} data-testid="conversation-state-badge">
                  {stateBadge.label}
                </span>
              ) : null}
              {thread.dealSuggested && thread.dealStatus !== "won" && thread.dealStatus !== "lost" ? (
                <span
                  className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-950 ring-1 ring-amber-300/80"
                  title="Proposta de fecho à espera de confirmação do gestor"
                  data-testid="deal-suggestion-pending-badge"
                >
                  Sugestão pendente
                </span>
              ) : null}
            </div>
          ) : null}

          {assigneeLabel ? (
            <p className="mt-0.5 truncate text-left text-[10px] font-medium text-[var(--df-text-muted)]" data-testid="assignee-line">
              Responsável: <span className="text-[var(--df-text-secondary)]">{assigneeLabel}</span>
            </p>
          ) : null}

          <p className="mt-1 line-clamp-2 text-left text-[12px] leading-snug text-[var(--df-text-secondary)]">
            <span className="font-semibold text-[var(--df-text-muted)]">{prefix}</span>
            <span className="text-[var(--df-text-muted)]"> · </span>
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
            <span className="tabular-nums text-[9px] font-semibold text-[var(--df-text-secondary)]" data-testid="lead-score-list">
              {thread.leadScore ?? 0} pts
            </span>
            {thread.aiState ? (
              <span className="max-w-[5.5rem] truncate rounded bg-[var(--df-brand-100)] px-1 py-0.5 text-[9px] font-medium text-[var(--df-brand-900)] ring-1 ring-[var(--df-border-subtle)]">
                {thread.aiState}
              </span>
            ) : null}
            {devFlowProspectingUi && followUpDue ? (
              <span
                className="df-badge-error !rounded px-1 py-0.5 text-[9px] font-bold !normal-case !tracking-normal"
                title="Follow-up comercial: hoje ou em atraso"
                data-testid="prospect-followup-due-chip"
              >
                FU hoje
              </span>
            ) : null}
            {devFlowProspectingUi ? stageChip : null}
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
                className="max-w-[7rem] truncate rounded-md px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-[color:var(--df-ring-soft)]"
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
                className="df-badge-success !rounded-md !px-1.5 !py-0.5 !text-[9px] !font-semibold !normal-case !tracking-normal"
                data-testid="awaiting-customer-chip"
                title="Última resposta enviada; à espera do cliente"
              >
                {thread.lastResponderType === "ai" ? "IA · aguarda cliente" : "Aguardando cliente"}
              </span>
            ) : null}
            {needsReply && thread.status === "OPEN" && !state && <span className="df-chip-awaiting">À espera</span>}
          </div>
        </div>
      </Button>

      {showActions && (canAssume || canClose) ? (
        <div
          className="pointer-events-none absolute right-2 top-1/2 z-[2] flex -translate-y-1/2 translate-x-1 flex-col gap-1 opacity-0 shadow-sm transition-all duration-200 ease-out group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {canAssume ? (
            <Button variant="disabled"
              type="button"
              disabled={busyAction?.id === thread.id}
              className="df-inbox-row-action-primary"
              onClick={() => onAssume?.(thread.id)}
              data-testid="action-assume"
            >
              {busyAction?.id === thread.id && busyAction.kind === "assume" ? "…" : "Assumir"}
            </Button>
          ) : null}
          {canClose ? (
            <Button variant="disabled"
              type="button"
              disabled={busyAction?.id === thread.id}
              className="df-inbox-row-action-secondary"
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
