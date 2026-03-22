"use client";

import { useState, useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sendInboxMessage, reportTyping } from "./inboxFetch";
import { INBOX_QK, type WaInboxMessageRow } from "./inboxTypes";

const TYPING_DEBOUNCE_MS = 400;
const TYPING_STOP_DELAY_MS = 1500;

export function MessageInput({ threadId }: { threadId: string | null }) {
  const [text, setText] = useState("");
  const [retryText, setRetryText] = useState<string | null>(null);
  const qc = useQueryClient();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: typingUsers } = useQuery({
    queryKey: threadId ? INBOX_QK.typing(threadId) : (["inbox-typing", "none"] as const),
    queryFn: () => [] as Array<{ userId: string; name?: string }>,
    initialData: [] as Array<{ userId: string; name?: string }>,
    staleTime: Number.POSITIVE_INFINITY,
    enabled: Boolean(threadId),
  });
  const typingList = Array.isArray(typingUsers) ? typingUsers : [];

  const mutation = useMutation({
    mutationFn: ({ tid, body }: { tid: string; body: string }) =>
      sendInboxMessage(tid, body),
    onMutate: async ({ tid, body }) => {
      await qc.cancelQueries({ queryKey: INBOX_QK.messages(tid) });
      const prev = qc.getQueryData<WaInboxMessageRow[]>(INBOX_QK.messages(tid));
      const optimistic: WaInboxMessageRow = {
        id: `optimistic-${Date.now()}`,
        waMessageId: "pending",
        direction: "OUTBOUND",
        fromNumber: "",
        toNumber: "",
        messageType: "TEXT",
        contentText: body,
        contentJson: null,
        ts: new Date().toISOString(),
        status: "SENT",
        errorCode: null,
        errorMessage: null,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<WaInboxMessageRow[]>(INBOX_QK.messages(tid), (old) => [
        ...(old ?? []),
        optimistic,
      ]);
      return { prev, tid };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(INBOX_QK.messages(vars.tid), ctx.prev);
      }
      setRetryText(vars.body);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: INBOX_QK.messages(vars.tid) });
      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
    },
    onSuccess: () => {
      setText("");
      setRetryText(null);
    },
  });

  useEffect(() => {
    if (!threadId) return;
    if (text.length > 0) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        reportTyping(threadId, true);
        typingTimeoutRef.current = null;
      }, TYPING_DEBOUNCE_MS);
      stopTypingTimeoutRef.current = setTimeout(() => {
        reportTyping(threadId, false);
        stopTypingTimeoutRef.current = null;
      }, TYPING_STOP_DELAY_MS);
    } else {
      reportTyping(threadId, false);
    }
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
      reportTyping(threadId, false);
    };
  }, [threadId, text]);

  const send = useCallback(() => {
    if (!threadId || !text.trim() || mutation.isPending) return;
    reportTyping(threadId, false);
    mutation.mutate({ tid: threadId, body: text.trim() });
  }, [threadId, text, mutation]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!threadId) {
    return (
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-400">
        Selecione uma conversa para responder
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-3" data-testid="message-input">
      {typingList.length > 0 && (
        <p className="mb-2 text-xs text-gray-500 italic">
          {typingList.map((t) => t.name || t.userId).join(", ")}
          {typingList.length === 1 ? " está digitando…" : " estão digitando…"}
        </p>
      )}
      {mutation.isError && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>Falha ao enviar.</span>
          {retryText && (
            <button
              type="button"
              className="font-medium underline"
              onClick={() => {
                if (!threadId) return;
                mutation.reset();
                mutation.mutate({ tid: threadId, body: retryText });
              }}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Digite uma mensagem…"
          rows={2}
          disabled={mutation.isPending}
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={send}
          disabled={mutation.isPending || !text.trim()}
          className="self-end rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {mutation.isPending ? "…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}
