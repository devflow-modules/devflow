"use client";

import { memo } from "react";
import type { WaInboxThreadRow } from "./inboxTypes";

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

  return (
    <button
      type="button"
      onClick={() => onSelect(thread.id)}
      data-testid="conversation-item"
      data-thread-id={thread.id}
      className={`flex w-full gap-3 border-b border-gray-100 px-3 py-3 text-left transition hover:bg-gray-50 ${
        active ? "bg-emerald-50/80" : "bg-white"
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
        {title.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium text-gray-900">{title}</span>
          <span className="shrink-0 text-xs text-gray-400">
            {formatListTime(thread.lastMessageAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-sm text-gray-500">{preview}</p>
          {thread.unreadCount > 0 && (
            <span
              className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white"
              data-testid="unread-badge"
            >
              {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {thread.status && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                thread.status === "OPEN"
                  ? "bg-amber-100 text-amber-800"
                  : thread.status === "CLOSED"
                    ? "bg-gray-100 text-gray-600"
                    : "bg-sky-100 text-sky-800"
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
            <span className="truncate max-w-[80px] rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600" title={thread.assignedToUser.name}>
              {thread.assignedToUser.name.split(" ")[0]}
            </span>
          )}
        </div>
      </div>
    </button>
  );
});
