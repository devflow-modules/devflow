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
  updateThreadQueue,
} from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import { CONVERSATION_STATE_LABELS } from "@/modules/inbox/waInboxConversationState";
import { formatWaitDurationMs } from "@/modules/inbox/waInboxSla";
import type { InboxSlaLevel } from "./inboxTypes";
import { buttonClassName } from "@/components/ui/button";
import { SLA_LEVEL_BADGE_CLASS } from "./inboxOperationalStyles";
import { FeatureUpgradePrompt } from "@/components/billing/FeatureUpgradePrompt";
import type { FeatureNotAvailablePayload } from "@/lib/protected-fetch";
import { isFeatureBlockedError } from "@/lib/protected-fetch";

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
};

export function ChatHeader({
  threadId,
  thread,
  onBackMobile,
  showBack,
  auditTab,
  onAuditTabChange,
  onOpenNotes,
}: ChatHeaderProps) {
  const client = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
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
    try {
      setActionBusy(true);
      await updateConversationStatus(threadId, status);
      invalidate();
    } catch (err) {
      console.error(err);
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
  const stateLabel = state ? CONVERSATION_STATE_LABELS[state] : null;
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

  return (
    <header className="df-inbox-header">
      <div className="flex items-start gap-3 px-4 py-4 sm:px-6 sm:py-5">
        {showBack && (
          <button
            type="button"
            onClick={onBackMobile}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden df-focus-brand"
            aria-label="Voltar"
          >
            ←
          </button>
        )}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--df-brand-600)] text-sm font-bold text-white">
          {title.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="df-text-section-title truncate">{title}</h2>
          {thread.phoneNumber && (
            <p className="truncate text-xs text-slate-500/90">{thread.phoneNumber}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {stateLabel ? <span className="df-chip-conv-state">{stateLabel}</span> : null}
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
          <p className="mt-2 text-xs text-slate-600">
            <span className="font-medium text-slate-500">Responsável: </span>
            {thread.assignedToUser ? (
              <strong>{thread.assignedToUser.name}</strong>
            ) : thread.status === "CLOSED" ? (
              <span className="text-slate-500">—</span>
            ) : thread.conversationState === "awaiting_customer" ? (
              <span className={thread.lastResponderType === "ai" ? "text-emerald-800" : "text-slate-700"}>
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
          {thread.whatsappLine ? (
            <p className="mt-1 truncate text-[11px] text-slate-400">
              Linha:{" "}
              {thread.whatsappLine.label?.trim() ||
                thread.whatsappLine.displayPhoneNumber?.trim() ||
                `${thread.businessPhoneNumberId.slice(0, 10)}…`}
            </p>
          ) : null}
          {inboxQueues.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500">Fila</span>
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
            <div className="mt-3 max-w-xl">
              <FeatureUpgradePrompt
                blocked={queueUpgradeBlock}
                onDismiss={() => setQueueUpgradeBlock(null)}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100/90 bg-slate-50/40 px-4 py-3 sm:px-6">
        {canAssume ? (
          <button
            type="button"
            disabled={actionBusy}
            className={buttonClassName("primary")}
            onClick={() => handleAssign("me")}
            data-testid="header-assume"
          >
            Assumir
          </button>
        ) : null}
        {canRelease ? (
          <button
            type="button"
            disabled={actionBusy}
            className={buttonClassName("secondary")}
            onClick={() => handleAssign(null)}
            data-testid="header-release"
          >
            Liberar
          </button>
        ) : null}
        {canClose ? (
          <button
            type="button"
            disabled={actionBusy}
            className={buttonClassName("secondary")}
            onClick={() => handleStatus("CLOSED")}
            data-testid="header-close"
          >
            Fechar
          </button>
        ) : null}
        {canReopen ? (
          <button
            type="button"
            disabled={actionBusy}
            className={buttonClassName("secondary")}
            onClick={() => handleStatus("OPEN")}
            data-testid="header-reopen"
          >
            Reabrir
          </button>
        ) : null}

        <div className="relative" ref={assignRef}>
          <button
            type="button"
            onClick={() => setAssignOpen((o) => !o)}
            className="df-inbox-toolbar-btn max-w-full min-w-0 justify-start text-slate-600"
          >
            {thread.assignedToUser ? thread.assignedToUser.name : "Responsável…"}
          </button>
          {assignOpen && (
            <div className="df-inbox-dropdown w-52 max-w-[min(100vw-2rem,13rem)]">
              <button type="button" className="df-inbox-dropdown-item" onClick={() => handleAssign("me")}>
                Eu como responsável
              </button>
              <button type="button" className="df-inbox-dropdown-item" onClick={() => handleAssign(null)}>
                Remover responsável
              </button>
              {usersFetched.map((u: { id: string; name: string }) => (
                <button
                  key={u.id}
                  type="button"
                  className="df-inbox-dropdown-item"
                  onClick={() => handleAssign(u.id)}
                >
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={statusRef}>
          <button type="button" onClick={() => setStatusOpen((o) => !o)} className="df-inbox-toolbar-btn">
            Estado
          </button>
          {statusOpen && (
            <div className="df-inbox-dropdown w-40">
              {(["OPEN", "PENDING", "CLOSED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="df-inbox-dropdown-item"
                  onClick={() => handleStatus(s)}
                >
                  {s === "OPEN" ? "Aberta" : s === "CLOSED" ? "Fechada" : "Pendente"}
                </button>
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
              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-white"
              style={{ backgroundColor: tt.tag.color || "#6b7280" }}
            >
              {tt.tag.name}
              <button
                type="button"
                aria-label={`Remover ${tt.tag.name}`}
                className="hover:opacity-80"
                onClick={() => handleRemoveTag(tt.tag.id)}
              >
                ×
              </button>
            </span>
          ))}
          <button type="button" onClick={() => setTagOpen((o) => !o)} className="df-inbox-tag-add">
            + Tag
          </button>
          {tagOpen && (
            <div className="df-inbox-dropdown max-h-44 w-52 overflow-y-auto">
              {tagsFetched.filter((t: { id: string }) => !threadTagIds.has(t.id)).map((t: { id: string; name: string }) => (
                <button
                  key={t.id}
                  type="button"
                  className="df-inbox-dropdown-item"
                  onClick={() => handleAddTag(t.id)}
                >
                  {t.name}
                </button>
              ))}
              {tagsFetched.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-500">Crie tags nas definições.</p>
              )}
            </div>
          )}
        </div>

        {onOpenNotes ? (
          <button type="button" onClick={onOpenNotes} className="df-inbox-pill-notes" data-testid="header-notes">
            Notas
          </button>
        ) : null}

        {onAuditTabChange ? (
          <button
            type="button"
            onClick={() => onAuditTabChange(!auditTab)}
            className={auditTab ? "df-inbox-pill-audit-on" : "df-inbox-pill-audit-off"}
          >
            Histórico
          </button>
        ) : null}
      </div>
    </header>
  );
}
