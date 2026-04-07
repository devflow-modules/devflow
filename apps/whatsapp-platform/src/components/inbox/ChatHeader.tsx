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

function useSlaLabel(thread: WaInboxThreadRow | null): string {
  if (!thread) return "";
  const lastC = thread.lastCustomerMessageAt ? new Date(thread.lastCustomerMessageAt).getTime() : null;
  const lastA = thread.lastAgentReplyAt ? new Date(thread.lastAgentReplyAt).getTime() : null;
  const first = thread.firstResponseAt ? new Date(thread.firstResponseAt).getTime() : null;
  const created = new Date(thread.createdAt).getTime();
  const now = Date.now();
  if (lastC && !lastA) {
    const min = Math.floor((now - lastC) / 60000);
    if (min < 1) return "Aguardando resposta";
    return `Aguardando há ${min}m`;
  }
  if (first && lastC) {
    const min = Math.round((first - Math.min(created, lastC)) / 60000);
    if (min >= 0) return `1ª resposta em ${min}m`;
  }
  if (lastA && lastC) {
    const min = Math.round((lastA - lastC) / 60000);
    if (min >= 0) return `Respondido em ${min}m`;
  }
  return "";
}

type ChatHeaderProps = {
  threadId: string | null;
  thread: WaInboxThreadRow | null;
  onBackMobile?: () => void;
  showBack?: boolean;
  auditTab?: boolean;
  onAuditTabChange?: (show: boolean) => void;
};

export function ChatHeader({
  threadId,
  thread,
  onBackMobile,
  showBack,
  auditTab,
  onAuditTabChange,
}: ChatHeaderProps) {
  const client = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const assignRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);

  const { data: tags = [] } = useQuery({
    queryKey: INBOX_QK.tags,
    queryFn: fetchInboxTags,
  });
  const { data: users = [] } = useQuery({
    queryKey: INBOX_QK.users,
    queryFn: fetchInboxUsers,
  });
  const { data: viewersList = [] } = useQuery({
    queryKey: threadId ? INBOX_QK.viewers(threadId) : (["inbox-viewers", "none"] as const),
    queryFn: () => [] as Array<{ userId: string; name?: string }>,
    initialData: [] as Array<{ userId: string; name?: string }>,
    staleTime: Number.POSITIVE_INFINITY,
    enabled: Boolean(threadId),
  });

  const slaLabel = useSlaLabel(thread);
  const threadTagIds = new Set(thread?.threadTags?.map((tt) => tt.tag.id) ?? []);

  const invalidate = () => {
    client.invalidateQueries({ queryKey: ["inbox-conversations"] });
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
      await assignConversation(threadId, userId);
      invalidate();
    } catch (err) {
      console.error(err);
    }
    setAssignOpen(false);
  };

  const handleStatus = async (status: "OPEN" | "PENDING" | "CLOSED") => {
    try {
      await updateConversationStatus(threadId, status);
      invalidate();
    } catch (err) {
      console.error(err);
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

  const waiting =
    thread.lastCustomerMessageAt &&
    (!thread.lastAgentReplyAt ||
      new Date(thread.lastAgentReplyAt) < new Date(thread.lastCustomerMessageAt));

  return (
    <header className="flex flex-col border-b border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
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
            {waiting && thread.status === "OPEN" && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-900">
                À espera de resposta
              </span>
            )}
            {!waiting && thread.lastAgentReplyAt && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-900 ring-1 ring-emerald-100">
                Em conversa
              </span>
            )}
            {slaLabel ? (
              <span className="text-[11px] font-medium text-slate-500">{slaLabel}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100/90 bg-slate-50/40 px-4 py-3 sm:px-6">
        <div className="relative" ref={assignRef}>
          <button
            type="button"
            onClick={() => setAssignOpen((o) => !o)}
            className="rounded-lg border border-slate-100 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-200 hover:bg-slate-50/80"
          >
            {thread.assignedToUser ? thread.assignedToUser.name : "Atribuir"}
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
              {users.map((u) => (
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
            {thread.status === "OPEN" ? "Aberta" : thread.status === "CLOSED" ? "Fechada" : "Pendente"}
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

        <div className="relative flex flex-wrap items-center gap-1" ref={tagRef}>
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
              {tags.filter((t) => !threadTagIds.has(t.id)).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => handleAddTag(t.id)}
                >
                  {t.name}
                </button>
              ))}
              {tags.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-500">Crie tags em Configurações.</p>
              )}
            </div>
          )}
        </div>

        {onAuditTabChange && (
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
        )}
      </div>

      {(thread.assignedToUser || viewersList.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-xs text-slate-600 sm:px-5">
          {thread.assignedToUser && (
            <span>Atendido por: <strong>{thread.assignedToUser.name}</strong></span>
          )}
          {viewersList.length > 0 && (
            <span>
              Visualizando: {viewersList.map((v) => v.name || v.userId).join(", ")}
            </span>
          )}
        </div>
      )}
    </header>
  );
}
