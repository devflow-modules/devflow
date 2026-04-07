"use client";

import { memo } from "react";
import type { WaInboxThreadRow } from "./inboxTypes";
import { threadNeedsAgentReply } from "./messageOutboundKind";

function formatListTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

export const ConversationItem = memo(function ConversationItem({
  thread,
  active,
  onSelect,
}: {
  thread: WaInboxThreadRow;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const title = thread.contactName?.trim() || thread.phoneNumber;
  const preview = thread.lastMessagePreview?.trim() || "—";
  const needsReply = threadNeedsAgentReply(thread);

  return (
    <button
      type="button"
      onClick={() => onSelect(thread.id)}
      data-testid="conversation-item"
      data-thread-id={thread.id}
      className={`flex w-full gap-3.5 border-b border-slate-100/90 px-4 py-4 text-left transition-colors ${
        active
          ? "border-l-[3px] border-l-[var(--df-brand-500)] bg-slate-50/95 pl-[calc(1rem-3px)]"
          : "border-l-[3px] border-l-transparent bg-white pl-[calc(1rem-3px)] hover:bg-slate-50/80"
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          active ? "bg-[var(--df-brand-600)] text-white shadow-sm" : "bg-slate-100 text-slate-600"
        }`}
      >
        {title.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`truncate font-semibold ${active ? "text-slate-950" : "text-slate-800"}`}>{title}</span>
          <span className="shrink-0 text-xs tabular-nums text-slate-400/90">
            {formatListTime(thread.lastMessageAt)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate text-sm leading-snug text-slate-500/95">{preview}</p>
          {thread.unreadCount > 0 && (
            <span
              className="shrink-0 rounded-full bg-[var(--df-brand-600)] px-2 py-0.5 text-xs font-semibold text-white"
              data-testid="unread-badge"
            >
              {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {needsReply && thread.status === "OPEN" && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
              À espera
            </span>
          )}
          {thread.status && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                thread.status === "OPEN"
                  ? "bg-slate-100 text-slate-700"
                  : thread.status === "CLOSED"
                    ? "bg-slate-100 text-slate-500"
                    : "bg-indigo-50 text-indigo-800"
              }`}
            >
              {thread.status === "OPEN" ? "Aberta" : thread.status === "CLOSED" ? "Fechada" : "Pendente"}
            </span>
          )}
          {thread.priority === "HIGH" && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800">
              Alta
            </span>
          )}
          {thread.assignedToUser && (
            <span
              className="max-w-[100px] truncate rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-900 ring-1 ring-emerald-100"
              title={thread.assignedToUser.name}
            >
              {thread.assignedToUser.name.split(" ")[0]}
            </span>
          )}
        </div>
      </div>
    </button>
  );
});
