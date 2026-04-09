"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageBubble } from "./MessageBubble";
import { fetchInboxMessages } from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import type { WaInboxMessageRow } from "./inboxTypes";
import type { WaInboxThreadRow } from "./inboxTypes";
import { useInboxRealtime } from "./useInboxRealtime";
import { StateEmpty, StateError, StateLoading } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import {
  calendarDayKey,
  daySeparatorLabel,
  firstUnreadSeparatorIndex,
} from "./chatMessageUtils";

const POLL_INTERVAL_REALTIME_MS = 10_000;
const POLL_INTERVAL_FALLBACK_MS = 5_000;
const CLUSTER_MAX_GAP_MS = 5 * 60 * 1000;

function isCompactContinuation(messages: WaInboxMessageRow[], index: number): boolean {
  if (index === 0) return false;
  const prev = messages[index - 1];
  const cur = messages[index];
  if (prev.direction !== cur.direction) return false;
  const dt = new Date(cur.ts).getTime() - new Date(prev.ts).getTime();
  return dt >= 0 && dt < CLUSTER_MAX_GAP_MS;
}

export function MessageList({
  threadId,
  thread,
}: {
  threadId: string | null;
  thread?: WaInboxThreadRow | null;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef<string | null>(null);
  const { connected: realtimeConnected } = useInboxRealtime();
  const pollInterval = realtimeConnected ? POLL_INTERVAL_REALTIME_MS : POLL_INTERVAL_FALLBACK_MS;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: threadId ? INBOX_QK.messages(threadId) : ["inbox-messages", "none"],
    queryFn: () => fetchInboxMessages(threadId!),
    enabled: Boolean(threadId),
    refetchInterval: threadId ? pollInterval : false,
  });

  const unreadIdx = useMemo(
    () => (data?.length ? firstUnreadSeparatorIndex(data, thread?.unreadCount) : null),
    [data, thread?.unreadCount]
  );

  const timeline = useMemo(() => {
    if (!data?.length) return [];
    const out: Array<
      | { kind: "day"; label: string }
      | { kind: "unread" }
      | { kind: "msg"; message: WaInboxMessageRow; indexInData: number }
    > = [];
    let lastDay = "";
    for (let i = 0; i < data.length; i++) {
      const m = data[i];
      const dk = calendarDayKey(m.ts);
      if (dk !== lastDay) {
        out.push({ kind: "day", label: daySeparatorLabel(m.ts) });
        lastDay = dk;
      }
      if (unreadIdx !== null && i === unreadIdx) {
        out.push({ kind: "unread" });
      }
      out.push({ kind: "msg", message: m, indexInData: i });
    }
    return out;
  }, [data, unreadIdx]);

  useLayoutEffect(() => {
    if (!data?.length) return;
    const last = data[data.length - 1];
    if (lastMsgIdRef.current !== last.id) {
      lastMsgIdRef.current = last.id;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadId]);

  if (!threadId) {
    return (
      <div className="df-state-empty flex flex-1 flex-col items-center justify-center border-0 bg-transparent px-6 py-16 shadow-none">
        <p className="text-sm font-semibold text-slate-800">Escolha uma conversa</p>
        <p className="df-text-muted mt-2 max-w-xs">Na lista à esquerda, toque num contacto para abrir o histórico.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center p-4" data-testid="messages-loading">
        <StateLoading message="A carregar mensagens…" className="min-h-[12rem] border-slate-200/80 bg-white/90 shadow-none" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center p-4">
        <StateError
          title="Não foi possível carregar as mensagens"
          message={error instanceof Error ? error.message : "Tente novamente."}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center p-4">
        <StateEmpty
          title="Sem mensagens nesta conversa"
          description="A primeira mensagem do cliente aparece aqui. Se acabou de abrir a conversa, peça um teste do telemóvel ou aguarde a resposta automática."
          action={
            <button type="button" className={buttonClassName("secondary")} onClick={() => void refetch()}>
              Atualizar
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/90 via-white/40 to-slate-100/60 px-4 py-6 sm:px-6 sm:py-8"
      data-testid="message-list"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        {timeline.map((item, ti) => {
          if (item.kind === "day") {
            return (
              <div key={`d-${ti}-${item.label}`} className="flex justify-center py-2">
                <span className="df-timeline-day">{item.label}</span>
              </div>
            );
          }
          if (item.kind === "unread") {
            return (
              <div key={`u-${ti}`} className="flex justify-center py-2" data-testid="unread-separator">
                <span className="df-timeline-unread">Novas mensagens</span>
              </div>
            );
          }
          const idx = item.indexInData;
          const compact = isCompactContinuation(data, idx);
          return (
            <div
              key={item.message.id}
              className={`transition-opacity duration-200 ${
                idx === 0 ? "" : compact ? "" : "mt-4"
              }`}
            >
              <MessageBubble message={item.message} compact={compact} />
            </div>
          );
        })}
        <div ref={bottomRef} className="h-px shrink-0 scroll-mt-4" aria-hidden />
      </div>
    </div>
  );
}
