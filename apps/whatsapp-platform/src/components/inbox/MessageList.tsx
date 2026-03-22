"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageBubble } from "./MessageBubble";
import { fetchInboxMessages } from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import { useInboxRealtime } from "./useInboxRealtime";

const POLL_INTERVAL_REALTIME_MS = 10_000;
const POLL_INTERVAL_FALLBACK_MS = 5_000;

function dateLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
}

export function MessageList({ threadId }: { threadId: string | null }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { connected: realtimeConnected } = useInboxRealtime();
  const pollInterval = realtimeConnected ? POLL_INTERVAL_REALTIME_MS : POLL_INTERVAL_FALLBACK_MS;

  const { data, isLoading, isError } = useQuery({
    queryKey: threadId ? INBOX_QK.messages(threadId) : ["inbox-messages", "none"],
    queryFn: () => fetchInboxMessages(threadId!),
    enabled: Boolean(threadId),
    refetchInterval: threadId ? pollInterval : false,
  });

  const grouped = useMemo(() => {
    if (!data?.length) return [];
    const out: { label: string; items: typeof data }[] = [];
    let currentLabel = "";
    let bucket: typeof data = [];
    for (const m of data) {
      const label = dateLabel(m.ts);
      if (label !== currentLabel) {
        if (bucket.length) out.push({ label: currentLabel, items: bucket });
        currentLabel = label;
        bucket = [m];
      } else {
        bucket.push(m);
      }
    }
    if (bucket.length) out.push({ label: currentLabel, items: bucket });
    return out;
  }, [data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadId, data?.length]);

  if (!threadId) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400">
        Selecione uma conversa
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex flex-1 items-center justify-center text-sm text-gray-500"
        data-testid="messages-loading"
      >
        Carregando mensagens…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-red-600">
        Erro ao carregar mensagens
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
        Sem mensagens nesta conversa
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto bg-[#e5ddd5] bg-opacity-90 px-3 py-4"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c8c8' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}
      data-testid="message-list"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        {grouped.map(({ label, items }) => (
          <div key={label}>
            <div className="mb-2 flex justify-center">
              <span className="rounded-lg bg-white/90 px-3 py-1 text-xs text-gray-600 shadow-sm capitalize">
                {label}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
