"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageBubble } from "./MessageBubble";
import { AutomationStatusHints, ConversationTimeline } from "./ConversationTimeline";
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
import { INBOX_CHAT_GUTTER_X } from "./inboxChatLayout";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_REALTIME_MS = 10_000;
const POLL_INTERVAL_FALLBACK_MS = 5_000;
const CLUSTER_MAX_GAP_MS = 5 * 60 * 1000;

/** Distância ao fundo da lista abaixo da qual consideramos “junto ao fim” (auto-scroll em nova mensagem). */
const NEAR_BOTTOM_THRESHOLD_PX = 96;

function isNearListBottom(el: HTMLElement, thresholdPx = NEAR_BOTTOM_THRESHOLD_PX): boolean {
  const { scrollTop, scrollHeight, clientHeight } = el;
  return scrollHeight - scrollTop - clientHeight <= thresholdPx;
}

/**
 * Scroll explícito no contentor `message-list` (scrollIntoView no bottomRef não garante
 * alinhar o overflow deste elemento quando o layout usa mt-auto / flex).
 */
function scheduleScrollMessageListToBottom(
  getEl: () => HTMLDivElement | null,
  behavior: ScrollBehavior
): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = getEl();
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
    });
  });
}

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
  const messageListRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef<string | null>(null);
  const prevThreadIdRef = useRef<string | null>(null);
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
    if (!threadId) {
      prevThreadIdRef.current = null;
      lastMsgIdRef.current = null;
      return;
    }
    if (!data?.length) return;
    const el = messageListRef.current;
    if (!el) return;

    if (prevThreadIdRef.current !== threadId) {
      prevThreadIdRef.current = threadId;
      lastMsgIdRef.current = null;
    }

    const last = data[data.length - 1];

    if (lastMsgIdRef.current === null) {
      lastMsgIdRef.current = last.id;
      scheduleScrollMessageListToBottom(() => messageListRef.current, "auto");
      return;
    }

    if (lastMsgIdRef.current === last.id) return;

    lastMsgIdRef.current = last.id;
    if (isNearListBottom(el)) {
      scheduleScrollMessageListToBottom(() => messageListRef.current, "smooth");
    }
  }, [threadId, data]);

  if (!threadId) {
    return (
      <div
        className={`df-state-empty flex min-h-0 flex-1 flex-col items-center justify-center border-0 bg-transparent py-16 shadow-none ${INBOX_CHAT_GUTTER_X}`}
      >
        <p className="text-sm font-semibold df-text-primary">Escolha uma conversa</p>
        <p className="df-text-muted mt-2 max-w-xs">Na lista à esquerda, toque num contacto para abrir o histórico.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={`flex h-full min-h-0 flex-col justify-center py-6 transition-opacity duration-300 sm:py-8 ${INBOX_CHAT_GUTTER_X}`}
        data-testid="messages-loading"
      >
        <StateLoading
          message="A carregar mensagens…"
          className="min-h-[12rem] border-border/80 bg-card/90 shadow-none motion-safe:animate-pulse motion-safe:duration-[1.6s]"
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`flex min-h-0 flex-1 flex-col justify-center py-6 sm:py-8 ${INBOX_CHAT_GUTTER_X}`}>
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
      <div className={`flex min-h-0 flex-1 flex-col justify-center py-6 sm:py-8 ${INBOX_CHAT_GUTTER_X}`}>
        <StateEmpty
          title="Sem mensagens nesta conversa"
          description="A primeira mensagem do cliente aparece aqui. Se acabou de abrir a conversa, peça um teste do telemóvel ou aguarde a resposta automática."
          action={
            <Button variant="secondary" type="button" className={buttonClassName("secondary")} onClick={() => void refetch()}>
              Atualizar
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      ref={messageListRef}
      className={`flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-gradient-to-b from-muted/40/90 via-card/40 to-slate-100/60 py-6 sm:py-8 ${INBOX_CHAT_GUTTER_X}`}
      data-testid="message-list"
    >
      <div className="flex min-h-full w-full max-w-none flex-col">
        <div className="flex shrink-0 flex-col gap-3.5">
          <ConversationTimeline messages={data} />
          {thread ? <AutomationStatusHints thread={thread} /> : null}
        </div>
        <div className="mt-auto flex w-full min-w-0 max-w-none flex-col gap-3.5">
          {timeline.map((item, ti) => {
            if (item.kind === "day") {
              return (
                <div key={`d-${ti}-${item.label}`} className="flex justify-center py-3" data-testid="day-separator">
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
                  idx === 0 ? "" : compact ? "" : "mt-5"
                }`}
              >
                <MessageBubble message={item.message} compact={compact} />
              </div>
            );
          })}
          <div ref={bottomRef} className="h-px shrink-0 scroll-mt-4" aria-hidden />
        </div>
      </div>
    </div>
  );
}
