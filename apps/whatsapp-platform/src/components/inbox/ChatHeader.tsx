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
} from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import { CONVERSATION_STATE_LABELS } from "@/modules/inbox/waInboxConversationState";
import { formatWaitDurationMs } from "@/modules/inbox/waInboxSla";
import type { InboxSlaLevel } from "./inboxTypes";
import { buttonClassName } from "@/components/ui/button";

const SLA_HEADER: Record<
  InboxSlaLevel,
  { label: string; className: string }
> = {
  low: { label: "SLA OK", className: "bg-slate-100 text-slate-700 ring-slate-200/80" },
  medium: { label: "SLA médio", className: "bg-amber-100 text-amber-950 ring-amber-200/80" },
  high: { label: "SLA alto", className: "bg-orange-100 text-orange-950 ring-orange-200/70" },
  critical: { label: "Crítico", className: "bg-red-100 text-red-950 ring-2 ring-red-400/80" },
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

  const title = thread.contactName?.trim() || thread.phoneNumber || "Conversa";
  const state = thread.conversationState;
  const stateLabel = state ? CONVERSATION_STATE_LABELS[state] : null;
  const sla = thread.slaLevel ? SLA_HEADER[thread.slaLevel] : null;
  const wait =
    thread.responseDelayMs != null && state === "awaiting_agent"
      ? formatWaitDurationMs(thread.responseDelayMs)
      : null;

  const canAssume = !thread.isAssignedToMe && thread.status !== "CLOSED";
  const canRelease = Boolean(thread.isAssignedToMe && thread.status !== "CLOSED");
  const canClose = thread.status !== "CLOSED";
  const canReopen = thread.status === "CLOSED";

  return (
    <header className="flex flex-col border-b border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3 px-4 py-4 sm:px-6 sm:py-5">
        {showBack && (
          <button
            type="button"
            onClick={onBackMobile}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Voltar"
          >
            ←
          </button>
        )}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--df-brand-600)] text-sm font-bold text-white">
          {title.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
          {thread.phoneNumber && (
            <p className="truncate text-xs text-slate-500/90">{thread.phoneNumber}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {stateLabel ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-800 ring-1 ring-slate-200/80">
                {stateLabel}
              </span>
            ) : null}
            {sla && wait ? (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${sla.className}`}
                data-testid="chat-header-sla"
              >
                {sla.label} · {wait}
              </span>
            ) : wait ? (
              <span className="text-[11px] font-medium text-slate-600">À espera há {wait}</span>
            ) : null}
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                thread.status === "OPEN"
                  ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100"
                  : thread.status === "CLOSED"
                    ? "bg-slate-100 text-slate-500"
                    : "bg-indigo-50 text-indigo-800"
              }`}
            >
              {thread.status === "OPEN" ? "Aberta" : thread.status === "CLOSED" ? "Fechada" : "Pendente"}
            </span>
            {thread.priority === "HIGH" ? (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800">
                Prioridade alta
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-slate-600">
            <span className="font-medium text-slate-500">Responsável: </span>
            {thread.assignedToUser ? (
              <strong>{thread.assignedToUser.name}</strong>
            ) : (
              <span className="text-amber-800">Sem dono</span>
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
            className={`${buttonClassName("secondary")} text-slate-700`}
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
            className="rounded-lg border border-slate-100 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-200 hover:bg-slate-50/80"
          >
            {thread.assignedToUser ? thread.assignedToUser.name : "Atribuir…"}
          </button>
          {assignOpen && (
            <div className="absolute left-0 top-full z-20 mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg shadow-slate-900/5">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => handleAssign("me")}
              >
                Atribuir a mim
              </button>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => handleAssign(null)}
              >
                Desatribuir
              </button>
              {usersFetched.map((u: { id: string; name: string }) => (
                <button
                  key={u.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => handleAssign(u.id)}
                >
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={statusRef}>
          <button
            type="button"
            onClick={() => setStatusOpen((o) => !o)}
            className="rounded-lg border border-slate-100 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-200 hover:bg-slate-50/80"
          >
            Estado
          </button>
          {statusOpen && (
            <div className="absolute left-0 top-full z-20 mt-1.5 w-40 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg shadow-slate-900/5">
              {(["OPEN", "PENDING", "CLOSED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
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
          <button
            type="button"
            onClick={() => setTagOpen((o) => !o)}
            className="rounded-lg border border-dashed border-slate-200 bg-white/80 px-2 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
          >
            + Tag
          </button>
          {tagOpen && (
            <div className="absolute left-0 top-full z-20 mt-1.5 max-h-44 w-52 overflow-auto rounded-xl border border-slate-100 bg-white py-1 shadow-lg shadow-slate-900/5">
              {tagsFetched.filter((t: { id: string }) => !threadTagIds.has(t.id)).map((t: { id: string; name: string }) => (
                <button
                  key={t.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
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
          <button
            type="button"
            onClick={onOpenNotes}
            className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-2.5 py-1.5 text-xs font-medium text-amber-950 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            data-testid="header-notes"
          >
            Notas
          </button>
        ) : null}

        {onAuditTabChange ? (
          <button
            type="button"
            onClick={() => onAuditTabChange(!auditTab)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              auditTab
                ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                : "border-slate-100 bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-200 hover:bg-slate-50/80"
            }`}
          >
            Histórico
          </button>
        ) : null}
      </div>
    </header>
  );
}
