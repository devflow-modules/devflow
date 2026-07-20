"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { WaInboxThreadRow } from "./inboxTypes";
import {
  assignConversation,
  updateConversationStatus,
  addTagToConversation,
  removeTagFromConversation,
  fetchInboxTags,
  fetchInboxUsers,
  fetchInboxOperationalQueues,
  fetchInboxTeam,
  updateThreadQueue,
} from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import { readVerifyPayload } from "@/lib/api-json-client";
import { fetchProtected } from "@/lib/protected-fetch";
import { AgentStatusBadge } from "./AgentStatusBadge";
import { getConversationStateBadge } from "./conversationStateUi";
import { formatWaitDurationMs } from "@/modules/inbox/waInboxSla";
import type { InboxSlaLevel } from "./inboxTypes";
import { buttonClassName } from "@/components/ui/button";
import { SLA_LEVEL_BADGE_CLASS } from "./inboxOperationalStyles";
import { FeatureUpgradePrompt } from "@/components/billing/FeatureUpgradePrompt";
import type { FeatureNotAvailablePayload } from "@/lib/protected-fetch";
import { isFeatureBlockedError } from "@/lib/protected-fetch";
import { useSessionRole } from "@/components/navigation/SessionRoleContext";
import { inboxAssigneeCopy } from "@/lib/roleProductLabels";
import { INBOX_CHAT_GUTTER_X, INBOX_CHAT_GUTTER_X_COMPACT } from "./inboxChatLayout";
import { Button } from "@/components/ui/button";
import { WHATSAPP_CHANNEL_PURPOSE_PT } from "@/lib/whatsappChannelPurposeLabels";

const SLA_LABEL: Record<InboxSlaLevel, string> = {
  low: "SLA OK",
  medium: "SLA médio",
  high: "SLA alto",
  critical: "Crítico",
};

type ChatHeaderProps = {
  threadId: string | null;
  thread: WaInboxThreadRow | null;
  onBackMobile?: () => void;
  showBack?: boolean;
  auditTab?: boolean;
  onAuditTabChange?: (show: boolean) => void;
  onOpenNotes?: () => void;
  /** Menos altura e padding — modo foco na inbox. */
  compactChrome?: boolean;
};

export function ChatHeader({
  threadId,
  thread,
  onBackMobile,
  showBack,
  auditTab,
  onAuditTabChange,
  onOpenNotes,
  compactChrome = false,
}: ChatHeaderProps) {
  const client = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [queueUpgradeBlock, setQueueUpgradeBlock] = useState<FeatureNotAvailablePayload | null>(null);
  const assignRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);

  const { data: tagsFetched = [] } = useQuery({
    queryKey: INBOX_QK.tags,
    queryFn: fetchInboxTags,
  });
  const { data: usersFetched = [] } = useQuery({
    queryKey: INBOX_QK.users,
    queryFn: fetchInboxUsers,
  });

  const { data: inboxQueues = [] } = useQuery({
    queryKey: ["inbox-operational-queues"],
    queryFn: fetchInboxOperationalQueues,
    staleTime: 60_000,
  });

  const { role: sessionRole } = useSessionRole();

  const { data: authUser, isSuccess: authLoaded } = useQuery({
    queryKey: ["inbox-header-auth-user"],
    queryFn: async () => {
      const res = await fetchProtected("/api/auth/verify");
      const raw = await res.json();
      return readVerifyPayload(raw)?.user ?? null;
    },
    staleTime: 60_000,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: INBOX_QK.team,
    queryFn: fetchInboxTeam,
    staleTime: 30_000,
  });

  const myAgentStatus = authUser?.id
    ? teamMembers.find((m) => m.userId === authUser.id)?.status
    : undefined;

  const threadTagIds = new Set(thread?.threadTags?.map((tt) => tt.tag.id) ?? []);

  const invalidate = () => {
    client.invalidateQueries({ queryKey: ["inbox-conversations"], exact: false });
    if (threadId) {
      client.invalidateQueries({ queryKey: INBOX_QK.thread(threadId) });
    }
  };

  useEffect(() => {
    function close(e: MouseEvent) {
      const target = e.target as Node;
      const outside =
        !assignRef.current?.contains(target) &&
        !statusRef.current?.contains(target) &&
        !tagRef.current?.contains(target);
      if (outside) {
        setAssignOpen(false);
        setStatusOpen(false);
        setTagOpen(false);
      }
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  if (!threadId || !thread) return null;

  const handleAssign = async (userId: string | null) => {
    try {
      setActionBusy(true);
      await assignConversation(threadId, userId);
      invalidate();
    } catch (err) {
      console.error(err);
    } finally {
      setActionBusy(false);
    }
    setAssignOpen(false);
  };

  const handleStatus = async (status: "OPEN" | "PENDING" | "CLOSED") => {
    setStatusError(null);
    try {
      setActionBusy(true);
      await updateConversationStatus(threadId, status);
      invalidate();
    } catch (err) {
      console.error(err);
      setStatusError(
        err instanceof Error && err.message.trim()
          ? err.message
          : "Não foi possível atualizar o estado da conversa. Tente novamente."
      );
    } finally {
      setActionBusy(false);
    }
    setStatusOpen(false);
  };

  const handleAddTag = async (tagId: string) => {
    try {
      await addTagToConversation(threadId, tagId);
      invalidate();
    } catch (err) {
      console.error(err);
    }
    setTagOpen(false);
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTagFromConversation(threadId, tagId);
      invalidate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleQueueChange = async (queueId: string | null) => {
    try {
      setActionBusy(true);
      setQueueUpgradeBlock(null);
      await updateThreadQueue(threadId, queueId);
      invalidate();
    } catch (err) {
      if (isFeatureBlockedError(err)) {
        setQueueUpgradeBlock(err.payload);
      } else {
        console.error(err);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const title = thread.contactName?.trim() || thread.phoneNumber || "Conversa";
  const state = thread.conversationState;
  const stateBadge = getConversationStateBadge(state);
  const slaLevel = thread.slaLevel;
  const slaLabel = slaLevel ? SLA_LABEL[slaLevel] : null;
  const slaBadgeClass = slaLevel ? SLA_LEVEL_BADGE_CLASS[slaLevel] : null;
  const wait =
    thread.responseDelayMs != null && state === "awaiting_agent"
      ? formatWaitDurationMs(thread.responseDelayMs)
      : null;

  const canAssume = !thread.isAssignedToMe && thread.status !== "CLOSED";
  const canRelease = Boolean(thread.isAssignedToMe && thread.status !== "CLOSED");
  const canClose = thread.status !== "CLOSED";
  const canReopen = thread.status === "CLOSED";

  const assigneeCopy = thread.assignedToUser
    ? inboxAssigneeCopy({
        assignedToUser: thread.assignedToUser,
        isAssignedToMe: thread.isAssignedToMe,
        sessionRole,
        authUserId: authUser?.id,
        threadStatus: thread.status,
      })
    : null;

  /** Toolbar integrada no cabeçalho — menos uma faixa vertical dedicada a «Acções». */
  const headerMaxH = compactChrome ? "max-h-[min(34vh,260px)]" : "max-h-[min(38vh,300px)]";
  const headerPad = compactChrome
    ? `${INBOX_CHAT_GUTTER_X_COMPACT} py-2 sm:py-2.5`
    : `${INBOX_CHAT_GUTTER_X} py-2.5 sm:py-3`;
  const toolbarBtn = compactChrome ? "df-inbox-toolbar-btn-compact" : "df-inbox-toolbar-btn";
  const primaryCompact =
    "min-h-8 px-2.5 py-1 text-[11px] font-semibold sm:min-h-9 sm:px-3 sm:text-xs";

  return (
    <header
      className={`df-inbox-header ${headerMaxH} shrink-0 overflow-y-auto overscroll-contain`}
      data-testid="chat-header"
    >
      <div className={`flex items-start gap-3 ${headerPad}`}>
        {showBack && (
          <Button variant="ghost"
            type="button"
            onClick={onBackMobile}
            className="shrink-0 rounded-lg px-2 py-2 text-sm font-semibold text-[var(--df-text-secondary)] hover:bg-[var(--df-brand-100)] md:hidden df-focus-brand"
            aria-label="Voltar à lista de conversas"
          >
            <span aria-hidden>←</span> Voltar
          </Button>
        )}
        <div
          className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--df-brand-600)] font-bold text-white ${
            compactChrome ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm"
          }`}
        >
          {title.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="df-text-section-title truncate text-[var(--df-text-primary)]">{title}</h2>
              {thread.phoneNumber && (
                <p className="truncate text-xs text-[var(--df-text-secondary)]">{thread.phoneNumber}</p>
              )}
            </div>
            {authLoaded && authUser?.id ? (
              <div className="shrink-0 pt-0.5" data-testid="header-my-agent-status">
                <AgentStatusBadge status={myAgentStatus} density={compactChrome ? "compact" : "comfortable"} />
              </div>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {stateBadge ? (
              <span className={stateBadge.className} data-testid="chat-header-state-badge">
                {stateBadge.label}
              </span>
            ) : null}
            {slaBadgeClass && slaLabel && wait ? (
              <span className={slaBadgeClass} data-testid="chat-header-sla">
                {slaLabel} · {wait}
              </span>
            ) : wait ? (
              <span className="df-inbox-sla-wait-muted">À espera há {wait}</span>
            ) : null}
            <span
              className={
                thread.status === "OPEN"
                  ? "df-chip-status-open"
                  : thread.status === "CLOSED"
                    ? "df-chip-status-closed"
                    : "df-chip-status-pending"
              }
            >
              {thread.status === "OPEN" ? "Aberta" : thread.status === "CLOSED" ? "Fechada" : "Pendente"}
            </span>
            {thread.priority === "HIGH" ? <span className="df-chip-priority-high">Prioridade alta</span> : null}
          </div>
          {thread.assignedToUser && assigneeCopy ? (
            <>
            <p className="mt-1.5 text-xs text-[var(--df-text-secondary)]" data-testid="chat-header-assignee">
                <strong className="font-semibold text-[var(--df-text-primary)]">{assigneeCopy.line}</strong>
              </p>
              {assigneeCopy.note ? (
                <p className="mt-1 text-[11px] leading-snug text-[var(--df-brand-400)]">{assigneeCopy.note}</p>
              ) : null}
            </>
          ) : (
            <p className="mt-1.5 text-xs text-[var(--df-text-secondary)]">
              <span className="font-medium text-[var(--df-text-muted)]">Responsável: </span>
              {thread.status === "CLOSED" ? (
                <span className="text-[var(--df-text-muted)]">—</span>
              ) : thread.conversationState === "awaiting_customer" ? (
                <span className={thread.lastResponderType === "ai" ? "text-[var(--df-brand-400)]" : "text-[var(--df-text-secondary)]"}>
                  {thread.lastResponderType === "ai"
                    ? "Assistente IA (aguarda cliente)"
                    : "Aguardando cliente"}
                </span>
              ) : thread.conversationState === "awaiting_agent" ? (
                <span className="text-amber-800">Sem responsável — precisa de resposta humana</span>
              ) : (
                <span className="text-amber-800">Sem responsável</span>
              )}
            </p>
          )}
          {thread.whatsappLine ? (
            <p className="mt-1 truncate text-[11px] text-[var(--df-text-muted)]">
              Linha:{" "}
              {thread.whatsappLine.label?.trim() ||
                thread.whatsappLine.displayPhoneNumber?.trim() ||
                `${thread.businessPhoneNumberId.slice(0, 10)}…`}
              {thread.whatsappLine.purpose && thread.whatsappLine.purpose !== "GENERAL" ? (
                <>
                  {" "}
                  ·{" "}
                  {WHATSAPP_CHANNEL_PURPOSE_PT[thread.whatsappLine.purpose] ??
                    thread.whatsappLine.purpose}
                </>
              ) : null}
            </p>
          ) : null}
          {inboxQueues.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-[var(--df-text-secondary)]">Fila</span>
              <select
                className="df-inbox-queue-select"
                disabled={actionBusy}
                value={thread.queue?.id ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  void handleQueueChange(v === "" ? null : v);
                }}
                aria-label="Fila da conversa"
              >
                <option value="">Nenhuma</option>
                {inboxQueues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {queueUpgradeBlock ? (
            <div className="mt-2 max-w-xl">
              <FeatureUpgradePrompt
                blocked={queueUpgradeBlock}
                onDismiss={() => setQueueUpgradeBlock(null)}
              />
            </div>
          ) : null}

          <div
            className={`mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/35 pt-2 ${compactChrome ? "" : "sm:gap-2"}`}
            data-testid="chat-header-actions"
          >
          {canAssume ? (
            <Button
              variant="primary"
              type="button"
              disabled={actionBusy}
              className={`${buttonClassName("primary")} ${primaryCompact} ${state === "awaiting_agent" ? "ring-2 ring-red-200/80" : ""}`}
              onClick={() => handleAssign("me")}
              data-testid="header-assume"
            >
              {compactChrome ? "Assumir" : "Assumir conversa"}
            </Button>
          ) : null}
          {canRelease ? (
            <Button
              variant="secondary"
              type="button"
              disabled={actionBusy}
              className={`${buttonClassName("secondary")} ${primaryCompact}`}
              onClick={() => handleAssign(null)}
              data-testid="header-release"
            >
              Liberar
            </Button>
          ) : null}
          {canClose ? (
            <Button
              variant="secondary"
              type="button"
              disabled={actionBusy}
              className={`${buttonClassName("secondary")} ${primaryCompact}`}
              onClick={() => handleStatus("CLOSED")}
              data-testid="header-close"
            >
              Encerrar
            </Button>
          ) : null}
          {canReopen ? (
            <Button
              variant="secondary"
              type="button"
              disabled={actionBusy}
              className={`${buttonClassName("secondary")} ${primaryCompact}`}
              onClick={() => handleStatus("OPEN")}
              data-testid="header-reopen"
            >
              Reabrir
            </Button>
          ) : null}
          {statusError ? (
            <p
              className="basis-full text-xs font-medium text-red-700"
              role="alert"
              data-testid="header-status-error"
            >
              {statusError}
            </p>
          ) : null}
        <div className="relative" ref={assignRef}>
          <Button variant="secondary"
            type="button"
            onClick={() => setAssignOpen((o) => !o)}
            className={`${toolbarBtn} max-w-full min-w-0 justify-start df-text-secondary`}
          >
            {thread.assignedToUser ? thread.assignedToUser.name : "Responsável…"}
          </Button>
          {assignOpen && (
            <div className="df-inbox-dropdown w-52 max-w-[min(100vw-2rem,13rem)]">
              <Button variant="secondary" type="button" className="df-inbox-dropdown-item" onClick={() => handleAssign("me")}>
                Eu como responsável
              </Button>
              <Button variant="secondary" type="button" className="df-inbox-dropdown-item" onClick={() => handleAssign(null)}>
                Remover responsável
              </Button>
              {usersFetched.map((u: { id: string; name: string }) => (
                <Button variant="secondary"
                  key={u.id}
                  type="button"
                  className="df-inbox-dropdown-item"
                  onClick={() => handleAssign(u.id)}
                >
                  {u.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={statusRef}>
          <Button variant="secondary"
            type="button"
            onClick={() => setStatusOpen((o) => !o)}
            className={toolbarBtn}
            data-testid="header-thread-status-trigger"
          >
            Estado
          </Button>
          {statusOpen && (
            <div className="df-inbox-dropdown w-40">
              {(["OPEN", "PENDING", "CLOSED"] as const).map((s) => (
                <Button variant="secondary"
                  key={s}
                  type="button"
                  className="df-inbox-dropdown-item"
                  data-testid={`header-thread-status-${s}`}
                  onClick={() => handleStatus(s)}
                >
                  {s === "OPEN" ? "Aberta" : s === "CLOSED" ? "Fechada" : "Pendente"}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div
          className="relative flex flex-wrap items-center gap-1"
          ref={tagRef}
          data-testid="chat-thread-tags"
        >
          {thread.threadTags?.map((tt) => (
            <span
              key={tt.tag.id}
              className={
                "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-white " +
                (tt.tag.color ? "" : "bg-muted-foreground")
              }
              style={tt.tag.color ? { backgroundColor: tt.tag.color } : undefined}
            >
              {tt.tag.name}
              <Button variant="ghost"
                type="button"
                aria-label={`Remover ${tt.tag.name}`}
                className="hover:opacity-80"
                onClick={() => handleRemoveTag(tt.tag.id)}
              >
                ×
              </Button>
            </span>
          ))}
          <Button variant="secondary" type="button" onClick={() => setTagOpen((o) => !o)} className="df-inbox-tag-add">
            + Tag
          </Button>
          {tagOpen && (
            <div className="df-inbox-dropdown max-h-44 w-52 overflow-y-auto">
              {tagsFetched.filter((t: { id: string }) => !threadTagIds.has(t.id)).map((t: { id: string; name: string }) => (
                <Button variant="secondary"
                  key={t.id}
                  type="button"
                  className="df-inbox-dropdown-item"
                  onClick={() => handleAddTag(t.id)}
                >
                  {t.name}
                </Button>
              ))}
              {tagsFetched.length === 0 && (
                <p className="px-3 py-2 text-xs text-[var(--df-text-secondary)]">Crie tags nas definições.</p>
              )}
            </div>
          )}
        </div>

        {onOpenNotes ? (
          <Button variant="secondary"
            type="button"
            onClick={onOpenNotes}
            className={compactChrome ? `${toolbarBtn} border-amber-400/40 bg-amber-500/12 text-amber-100` : "df-inbox-pill-notes"}
            data-testid="header-notes"
          >
            Notas
          </Button>
        ) : null}

        {onAuditTabChange ? (
          <Button variant="secondary"
            type="button"
            onClick={() => onAuditTabChange(!auditTab)}
            className={
              auditTab
                ? compactChrome
                  ? `${toolbarBtn} border-emerald-400/35 bg-emerald-500/15 text-emerald-100`
                  : "df-inbox-pill-audit-on"
                : compactChrome
                  ? toolbarBtn
                  : "df-inbox-pill-audit-off"
            }
          >
            Histórico
          </Button>
        ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
