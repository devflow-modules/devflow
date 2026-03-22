"use client";

import { useQuery } from "@tanstack/react-query";
import { ConversationItem } from "./ConversationItem";
import { fetchInboxConversations } from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import type { InboxConversationsFilter } from "./inboxTypes";
import { useInboxRealtime } from "./useInboxRealtime";

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
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-gray-500">
        Carregando conversas…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm">
        <p className="text-red-600">{error instanceof Error ? error.message : "Erro"}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-lg bg-gray-900 px-3 py-1.5 text-white"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const threads = data?.threads ?? [];
  if (threads.length === 0) {
    return (
      <div
        className="flex flex-1 items-center justify-center p-8 text-center text-sm text-gray-500"
        data-testid="conversations-empty"
      >
        Nenhuma conversa ainda. Quando clientes enviarem mensagens, elas aparecerão aqui.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex flex-wrap gap-1 border-b border-gray-100 bg-gray-50/80 px-2 py-2">
        {(Object.keys(FILTER_LABELS) as InboxConversationsFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              filter === f
                ? "bg-emerald-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
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
