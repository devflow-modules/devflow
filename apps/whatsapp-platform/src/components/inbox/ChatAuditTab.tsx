"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchInboxAuditLog } from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import { StateEmpty, StateError, StateLoading } from "@/components/ui/app-states";

const ACTION_LABELS: Record<string, string> = {
  assign: "atribuiu para",
  unassign: "desatribuiu",
  status_change: "mudou status para",
  tag_add: "adicionou tag",
  tag_remove: "removeu tag",
  message_send: "enviou mensagem",
  priority_change: "alterou prioridade",
  ai_reply: "IA respondeu",
  internal_note_create: "criou nota interna",
  internal_note_delete: "removeu nota interna",
  playbook_suggest: "gerou playbook (IA)",
  follow_up_prompt: "registou follow-up sugerido",
  notify: "notificação (regra)",
  automation_log: "registo de automação",
};

export function ChatAuditTab({ threadId }: { threadId: string | null }) {
  const { data: logs, isLoading, isError, error, refetch } = useQuery({
    queryKey: threadId ? INBOX_QK.audit(threadId) : ["inbox-audit", "none"],
    queryFn: () => fetchInboxAuditLog(threadId!),
    enabled: Boolean(threadId),
  });

  if (!threadId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center p-4 sm:p-6">
        <StateEmpty
          title="Nenhuma conversa selecionada"
          description="Escolha uma thread na lista para ver o histórico de ações (atribuições, tags, estado, mensagens)."
          className="mx-auto max-w-md"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center p-4" data-testid="audit-tab-loading">
        <StateLoading message="A carregar histórico…" className="min-h-[12rem] flex-1 border-border/80 bg-card/90 shadow-none" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center p-4" data-testid="audit-tab">
        <StateError
          title="Histórico indisponível"
          message={error instanceof Error ? error.message : "Não foi possível carregar o histórico."}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center p-4 sm:p-6" data-testid="audit-tab">
        <StateEmpty
          title="Sem atividades registadas"
          description="Quando a equipa atribuir, alterar estado, adicionar tags ou enviar mensagens, as ações aparecem aqui por ordem cronológica."
          className="mx-auto max-w-md"
        />
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-100/90 via-slate-50/80 to-white px-3 py-5 sm:px-5"
      data-testid="audit-tab"
    >
      <ul className="mx-auto flex max-w-2xl flex-col gap-2">
        {logs.map((log) => {
          const label = ACTION_LABELS[log.action] ?? log.action;
          const userName = log.user?.name ?? log.userId;
          const extra =
            log.action === "status_change" && log.metadata && typeof log.metadata === "object" && "status" in log.metadata
              ? ` ${String((log.metadata as { status: string }).status)}`
              : log.action === "tag_add" && log.metadata && typeof log.metadata === "object" && "tagName" in log.metadata
                ? ` «${String((log.metadata as { tagName: string }).tagName)}»`
                : log.action === "tag_remove" && log.metadata && typeof log.metadata === "object" && "tagName" in log.metadata
                  ? ` «${String((log.metadata as { tagName: string }).tagName)}»`
                  : log.action === "playbook_suggest" && log.metadata && typeof log.metadata === "object" && "intent" in log.metadata
                    ? ` · ${String((log.metadata as { intent: string }).intent)}`
                    : log.action === "internal_note_create" && log.metadata && typeof log.metadata === "object" && "preview" in log.metadata
                      ? ` · ${String((log.metadata as { preview: string }).preview).slice(0, 80)}${String((log.metadata as { preview: string }).preview).length > 80 ? "…" : ""}`
                      : "";
          const date = new Date(log.createdAt);
          const dateStr = date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <li
              key={log.id}
              className="rounded-xl border border-border/90 bg-card px-4 py-3 shadow-sm df-ring-elevated"
            >
              <p className="text-sm leading-snug df-text-primary">
                <span className="font-semibold df-text-primary">{userName}</span> {label}
                {extra}
              </p>
              <p className="mt-1.5 text-xs font-medium tabular-nums df-text-muted">{dateStr}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
