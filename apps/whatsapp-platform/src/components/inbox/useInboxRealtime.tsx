"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { INBOX_QK } from "./inboxTypes";
import type { InboxRealtimeEvent } from "@/modules/realtime/realtime.types";
import type { WaInboxThreadRow, WaInboxMessageRow } from "./inboxTypes";

const STREAM_URL = "/api/realtime/stream";

const InboxRealtimeContext = createContext<{ connected: boolean } | null>(null);

/**
 * Retorna o estado da conexão realtime. Dentro do InboxRealtimeProvider retorna
 * o estado real; fora retorna { connected: false } (fallback para polling).
 */
export function useInboxRealtime() {
  const ctx = useContext(InboxRealtimeContext);
  return ctx ?? { connected: false };
}
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 30_000;

/**
 * Lógica interna da conexão SSE. Usado apenas pelo Provider.
 */
function useInboxRealtimeConnection(enabled = true) {
  const [connected, setConnected] = useState(false);
  const reconnectDelayRef = useRef(RECONNECT_DELAY_MS);
  const eventSourceRef = useRef<EventSource | null>(null);
  const qc = useQueryClient();

  const handleEvent = (raw: unknown) => {
    if (!raw || typeof raw !== "object") return;
    const ev = raw as InboxRealtimeEvent;

    switch (ev.type) {
      case "connected":
      case "ping":
        return;

      case "conversation.created": {
        qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
        return;
      }

      case "conversation.updated": {
        const { threadId, patch } = ev.payload;
        qc.setQueriesData(
          { queryKey: ["inbox-conversations"], exact: false },
          (old: unknown) => {
            if (!old || typeof old !== "object" || !("threads" in old)) return old;
            const data = old as { threads: WaInboxThreadRow[] };
            const threads = data.threads.map((t) =>
              t.id === threadId ? { ...t, ...patch } : t
            );
            return { ...data, threads };
          }
        );
        return;
      }

      case "conversation.assigned": {
        const { threadId, assignedToUserId, assignedToUser } = ev.payload;
        qc.setQueriesData(
          { queryKey: ["inbox-conversations"], exact: false },
          (old: unknown) => {
            if (!old || typeof old !== "object" || !("threads" in old)) return old;
            const data = old as { threads: WaInboxThreadRow[] };
            const threads = data.threads.map((t) =>
              t.id === threadId
                ? {
                    ...t,
                    assignedToUserId: assignedToUserId ?? undefined,
                    assignedToUser: assignedToUser ?? null,
                  }
                : t
            );
            return { ...data, threads };
          }
        );
        return;
      }

      case "conversation.status_changed": {
        const { threadId, status } = ev.payload;
        qc.setQueriesData(
          { queryKey: ["inbox-conversations"], exact: false },
          (old: unknown) => {
            if (!old || typeof old !== "object" || !("threads" in old)) return old;
            const data = old as { threads: WaInboxThreadRow[] };
            const threads = data.threads.map((t) =>
              t.id === threadId ? { ...t, status } : t
            );
            return { ...data, threads };
          }
        );
        return;
      }

      case "conversation.tags_changed": {
        const { threadId, tags } = ev.payload;
        qc.setQueriesData(
          { queryKey: ["inbox-conversations"], exact: false },
          (old: unknown) => {
            if (!old || typeof old !== "object" || !("threads" in old)) return old;
            const data = old as { threads: WaInboxThreadRow[] };
            const threads = data.threads.map((t) =>
              t.id === threadId
                ? {
                    ...t,
                    threadTags: tags.map((tag) => ({ tag })),
                  }
                : t
            );
            return { ...data, threads };
          }
        );
        return;
      }

      case "conversation.priority_changed": {
        const { threadId, priority } = ev.payload;
        qc.setQueriesData(
          { queryKey: ["inbox-conversations"], exact: false },
          (old: unknown) => {
            if (!old || typeof old !== "object" || !("threads" in old)) return old;
            const data = old as { threads: WaInboxThreadRow[] };
            const threads = data.threads.map((t) =>
              t.id === threadId ? { ...t, priority } : t
            );
            return { ...data, threads };
          }
        );
        return;
      }

      case "message.created": {
        const { threadId, message, threadPatch } = ev.payload;
        const msg: WaInboxMessageRow = {
          id: message.id,
          waMessageId: message.waMessageId,
          direction: message.direction,
          fromNumber: message.fromNumber,
          toNumber: message.toNumber,
          messageType: message.messageType,
          contentText: message.contentText,
          contentJson: {},
          ts: message.ts,
          status: message.status,
          errorCode: null,
          errorMessage: null,
          createdAt: message.createdAt,
        };
        qc.setQueryData<WaInboxMessageRow[]>(INBOX_QK.messages(threadId), (old) =>
          old ? [...old, msg] : [msg]
        );
        if (threadPatch) {
          qc.setQueriesData(
            { queryKey: ["inbox-conversations"], exact: false },
            (old: unknown) => {
              if (!old || typeof old !== "object" || !("threads" in old)) return old;
              const data = old as { threads: WaInboxThreadRow[] };
              const threads = data.threads.map((t) =>
                t.id === threadId ? { ...t, ...threadPatch } : t
              );
              return { ...data, threads };
            }
          );
        }
        return;
      }

      case "message.status_updated": {
        const { threadId, messageId, status } = ev.payload;
        qc.setQueryData<WaInboxMessageRow[]>(
          INBOX_QK.messages(threadId),
          (old) =>
            old?.map((m) => (m.id === messageId ? { ...m, status } : m)) ?? old
        );
        return;
      }

      case "presence.updated": {
        const { userId, status, user } = ev.payload;
        type PresenceEntry = { userId: string; name?: string; email?: string };
        qc.setQueryData<PresenceEntry[]>(INBOX_QK.presence, (old) => {
          const list = old ?? [];
          if (status === "online") {
            const exists = list.find((u) => u.userId === userId);
            if (exists) {
              return list.map((u) =>
                u.userId === userId
                  ? { userId, name: user?.name ?? u.name, email: user?.email ?? u.email }
                  : u
              );
            }
            return [...list, { userId, name: user?.name, email: user?.email }];
          }
          return list.filter((u) => u.userId !== userId);
        });
        return;
      }

      case "conversation.viewer_joined": {
        const { threadId: tid, userId: uid, user } = ev.payload;
        type ViewerEntry = { userId: string; name?: string };
        qc.setQueryData<ViewerEntry[]>(INBOX_QK.viewers(tid), (old) => {
          const list = old ?? [];
          if (list.some((v) => v.userId === uid)) return list;
          return [...list, { userId: uid, name: user?.name }];
        });
        return;
      }

      case "conversation.viewer_left": {
        const { threadId: tid, userId: uid } = ev.payload;
        qc.setQueryData(INBOX_QK.viewers(tid), (old: unknown) => {
          const list = Array.isArray(old) ? old : [];
          return list.filter((v: { userId: string }) => v.userId !== uid);
        });
        return;
      }

      case "typing.start": {
        const { threadId: tid, userId: uid, user } = ev.payload;
        type TypingEntry = { userId: string; name?: string };
        qc.setQueryData<TypingEntry[]>(INBOX_QK.typing(tid), (old) => {
          const list = old ?? [];
          if (list.some((t) => t.userId === uid)) return list;
          return [...list, { userId: uid, name: user?.name }];
        });
        return;
      }

      case "typing.stop": {
        const { threadId: tid, userId: uid } = ev.payload;
        qc.setQueryData(INBOX_QK.typing(tid), (old: unknown) => {
          const list = Array.isArray(old) ? old : [];
          return list.filter((t: { userId: string }) => t.userId !== uid);
        });
        return;
      }

      default:
        break;
    }
  };

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let mounted = true;

    const connect = () => {
      const es = new EventSource(STREAM_URL);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnected(true);
        reconnectDelayRef.current = RECONNECT_DELAY_MS;
      };

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as unknown;
          handleEvent(data);
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        setConnected(false);
        if (mounted) {
          timeoutId = setTimeout(
            connect,
            Math.min(
              reconnectDelayRef.current,
              MAX_RECONNECT_DELAY_MS
            )
          );
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * 1.5,
            MAX_RECONNECT_DELAY_MS
          );
        }
      };
    };

    connect();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [enabled]);

  return { connected };
}

/**
 * Provider que mantém uma única conexão SSE e fornece o estado aos filhos.
 * Use em volta da árvore da inbox.
 */
export function InboxRealtimeProvider({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const state = useInboxRealtimeConnection(enabled);
  return (
    <InboxRealtimeContext.Provider value={state}>
      {children}
    </InboxRealtimeContext.Provider>
  );
}
