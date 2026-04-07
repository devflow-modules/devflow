"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ConversationItem } from "./ConversationItem";
import { fetchInboxConversations } from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import type { InboxConversationsFilter } from "./inboxTypes";
import { useInboxRealtime } from "./useInboxRealtime";
import { StateEmpty, StateError, StateLoading } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";

const POLL_INTERVAL_REALTIME_MS = 10_000;
const POLL_INTERVAL_FALLBACK_MS = 5_000;

const FILTER_LABELS: Record<InboxConversationsFilter, string> = {
  all: "Todas",
  assigned_to_me: "Minhas",
  unassigned: "Sem dono",
  OPEN: "Abertas",
  PENDING: "Pendentes",
  CLOSED: "Fechadas",
};

export function ConversationsList({
  selectedId,
  onSelect,
  filter,
  onFilterChange,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: InboxConversationsFilter;
  onFilterChange: (f: InboxConversationsFilter) => void;
}) {
  const { connected: realtimeConnected } = useInboxRealtime();
  const pollInterval = realtimeConnected ? POLL_INTERVAL_REALTIME_MS : POLL_INTERVAL_FALLBACK_MS;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: INBOX_QK.conversations(filter),
    queryFn: () => fetchInboxConversations(filter),
    refetchInterval: pollInterval,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <StateLoading
          message="A carregar conversas…"
          className="min-h-[10rem] flex-1 rounded-xl border-slate-200/80 py-10 shadow-none"
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <StateError
          title="Não foi possível carregar as conversas"
          message={error instanceof Error ? error.message : "Tente outra vez dentro de momentos."}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const threads = data?.threads ?? [];
  if (threads.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-3" data-testid="conversations-empty">
        <StateEmpty
          title="Ainda não há conversas aqui"
          description={
            filter === "all"
              ? "As conversas aparecem aqui quando alguém escrever para o seu número. Confirme a ligação e envie um teste."
              : "Nada corresponde a este filtro. Experimente «Todas» ou peça para atribuírem conversas."
          }
          action={
            filter === "all" ? (
              <Link href="/dashboard/whatsapp" className={buttonClassName("primary")}>
                Rever ligação WhatsApp
              </Link>
            ) : (
              <button
                type="button"
                className={buttonClassName("secondary")}
                onClick={() => onFilterChange("all")}
              >
                Ver todas as conversas
              </button>
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex flex-wrap gap-1.5 border-b border-slate-100/90 bg-slate-50/50 px-3 py-3">
        {(Object.keys(FILTER_LABELS) as InboxConversationsFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-[background,color,box-shadow] ${
              filter === f
                ? "bg-[var(--df-brand-600)] text-white shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                : "bg-transparent text-slate-600 ring-1 ring-slate-200/70 hover:bg-white/80 hover:text-slate-800"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto" data-testid="conversations-list">
        {threads.map((t) => (
          <ConversationItem
            key={t.id}
            thread={t}
            active={t.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
