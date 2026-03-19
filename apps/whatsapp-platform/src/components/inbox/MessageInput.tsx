"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendInboxMessage } from "./inboxFetch";
import { INBOX_QK, type WaInboxMessageRow } from "./inboxTypes";

export function MessageInput({ threadId }: { threadId: string | null }) {
  const [text, setText] = useState("");
  const [retryText, setRetryText] = useState<string | null>(null);
  const qc = useQueryClient();

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
      qc.invalidateQueries({ queryKey: INBOX_QK.conversations });
    },
    onSuccess: () => {
      setText("");
      setRetryText(null);
    },
  });

  const send = useCallback(() => {
    if (!threadId || !text.trim() || mutation.isPending) return;
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
