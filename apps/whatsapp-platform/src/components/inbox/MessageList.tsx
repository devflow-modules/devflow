"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageBubble } from "./MessageBubble";
import { fetchInboxMessages } from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import type { WaInboxMessageRow } from "./inboxTypes";
import { useInboxRealtime } from "./useInboxRealtime";
import { StateEmpty, StateError, StateLoading } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";

const POLL_INTERVAL_REALTIME_MS = 10_000;
const POLL_INTERVAL_FALLBACK_MS = 5_000;
const CLUSTER_MAX_GAP_MS = 5 * 60 * 1000;

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

function isCompactContinuation(messages: WaInboxMessageRow[], index: number): boolean {
  if (index === 0) return false;
  const prev = messages[index - 1];
  const cur = messages[index];
  if (prev.direction !== cur.direction) return false;
  const dt = new Date(cur.ts).getTime() - new Date(prev.ts).getTime();
  return dt >= 0 && dt < CLUSTER_MAX_GAP_MS;
}

export function MessageList({ threadId }: { threadId: string | null }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { connected: realtimeConnected } = useInboxRealtime();
  const pollInterval = realtimeConnected ? POLL_INTERVAL_REALTIME_MS : POLL_INTERVAL_FALLBACK_MS;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: threadId ? INBOX_QK.messages(threadId) : ["inbox-messages", "none"],
    queryFn: () => fetchInboxMessages(threadId!),
    enabled: Boolean(threadId),
    refetchInterval: threadId ? pollInterval : false,
  });

  const grouped = useMemo(() => {
    if (!data?.length) return [];
    const out: { label: string; items: WaInboxMessageRow[] }[] = [];
    let currentLabel = "";
    let bucket: WaInboxMessageRow[] = [];
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
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-semibold text-slate-800">Escolha uma conversa</p>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">Na lista à esquerda, toque num contacto para abrir o histórico.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center p-4" data-testid="messages-loading">
        <StateLoading
          message="A carregar mensagens…"
          className="min-h-[12rem] border-slate-200/80 bg-white/90 shadow-none"
        />
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
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        {grouped.map(({ label, items }) => (
          <div key={label}>
            <div className="mb-4 flex justify-center sm:mb-5">
              <span className="rounded-full border border-slate-100 bg-white px-3.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                {label}
              </span>
            </div>
            <div className="flex flex-col">
              {items.map((m, i) => {
                const compact = isCompactContinuation(items, i);
                return (
                  <div key={m.id} className={compact ? "" : i > 0 ? "mt-4" : ""}>
                    <MessageBubble message={m} compact={compact} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
      </div>
    </div>
  );
}
