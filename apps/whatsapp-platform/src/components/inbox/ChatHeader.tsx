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
};

export function ChatHeader({ threadId, thread, onBackMobile, showBack }: ChatHeaderProps) {
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

  return (
    <header className="flex flex-col border-b border-gray-200 bg-gray-50">
      <div className="flex items-center gap-3 px-3 py-3">
        {showBack && (
          <button
            type="button"
            onClick={onBackMobile}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-200 md:hidden"
            aria-label="Voltar"
          >
            ←
          </button>
        )}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
          {title.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-gray-900">{title}</h2>
          {thread.phoneNumber && (
            <p className="truncate text-xs text-gray-500">{thread.phoneNumber}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
        <div className="relative" ref={assignRef}>
          <button
            type="button"
            onClick={() => setAssignOpen((o) => !o)}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            {thread.assignedToUser ? thread.assignedToUser.name : "Atribuir"}
          </button>
          {assignOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded border border-gray-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                onClick={() => handleAssign("me")}
              >
                Atribuir a mim
              </button>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                onClick={() => handleAssign(null)}
              >
                Desatribuir
              </button>
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
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
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            {thread.status === "OPEN" ? "Aberta" : thread.status === "CLOSED" ? "Fechada" : "Pendente"}
          </button>
          {statusOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 w-36 rounded border border-gray-200 bg-white py-1 shadow-lg">
              {(["OPEN", "PENDING", "CLOSED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
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
            className="rounded border border-dashed border-gray-400 px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
          >
            + Tag
          </button>
          {tagOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 max-h-40 w-48 overflow-auto rounded border border-gray-200 bg-white py-1 shadow-lg">
              {tags.filter((t) => !threadTagIds.has(t.id)).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                  onClick={() => handleAddTag(t.id)}
                >
                  {t.name}
                </button>
              ))}
              {tags.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-500">Crie tags em Configurações.</p>
              )}
            </div>
          )}
        </div>

        {slaLabel && (
          <span className="text-xs text-gray-500">{slaLabel}</span>
        )}
      </div>
    </header>
  );
}
