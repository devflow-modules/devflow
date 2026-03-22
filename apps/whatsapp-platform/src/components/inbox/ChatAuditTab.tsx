"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchInboxAuditLog } from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";

const ACTION_LABELS: Record<string, string> = {
  assign: "atribuiu para",
  unassign: "desatribuiu",
  status_change: "mudou status para",
  tag_add: "adicionou tag",
  tag_remove: "removeu tag",
  message_send: "enviou mensagem",
  priority_change: "alterou prioridade",
  ai_reply: "IA respondeu",
};

export function ChatAuditTab({ threadId }: { threadId: string | null }) {
  const { data: logs, isLoading, isError } = useQuery({
    queryKey: threadId ? INBOX_QK.audit(threadId) : ["inbox-audit", "none"],
    queryFn: () => fetchInboxAuditLog(threadId!),
    enabled: Boolean(threadId),
  });

  if (!threadId) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
        Selecione uma conversa
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
        Carregando histórico…
      </div>
    );
  }

  if (isError || !logs?.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-gray-500">
        {isError ? "Erro ao carregar histórico" : "Nenhuma ação registrada ainda"}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4" data-testid="audit-tab">
      <ul className="space-y-3">
        {logs.map((log) => {
          const label = ACTION_LABELS[log.action] ?? log.action;
          const userName = log.user?.name ?? log.userId;
          const extra =
            log.action === "status_change" && log.metadata && typeof log.metadata === "object" && "status" in log.metadata
              ? ` ${String((log.metadata as { status: string }).status)}`
              : log.action === "tag_add" && log.metadata && typeof log.metadata === "object" && "tagName" in log.metadata
                ? ` "${String((log.metadata as { tagName: string }).tagName)}"`
                : log.action === "tag_remove" && log.metadata && typeof log.metadata === "object" && "tagName" in log.metadata
                  ? ` "${String((log.metadata as { tagName: string }).tagName)}"`
                  : "";
          const date = new Date(log.createdAt);
          const dateStr = date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <li key={log.id} className="flex flex-col gap-0.5 border-b border-gray-100 pb-2 last:border-0">
              <span className="text-sm text-gray-800">
                <strong>{userName}</strong> {label}
                {extra}
              </span>
              <span className="text-xs text-gray-400">{dateStr}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
