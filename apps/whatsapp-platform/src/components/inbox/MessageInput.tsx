"use client";

import { useState, useCallback, useEffect, useRef, useMemo, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  sendInboxMessage,
  reportTyping,
  fetchSuggestedReply,
  logFollowUpUse,
  fetchTenantWhatsappLines,
  isWhatsappOutboundEnabledForThread,
} from "./inboxFetch";
import { INBOX_QK, type WaInboxMessageRow, type WaInboxThreadRow } from "./inboxTypes";
import { buttonClassName } from "@/components/ui/button";
import { followUpSuggestion } from "./followUpUtils";
import { PlaybookSuggest } from "./PlaybookSuggest";
import { markFirstReplySent } from "@/lib/activationStorage";

const TYPING_DEBOUNCE_MS = 400;
const TYPING_STOP_DELAY_MS = 1500;

const OUTBOUND_LOCKED_HINT = "Disponível após ativação do número";

const QUICK_TEMPLATES: { label: string; text: string }[] = [
  { label: "Saudação", text: "Olá! Obrigado pelo contacto. Como posso ajudar?" },
  { label: "Aguardar", text: "Obrigado pela paciência — já verifico e volto já com uma resposta." },
  { label: "Dados", text: "Pode enviar mais detalhes ou um print do ecrã, por favor?" },
  { label: "Horário", text: "O nosso horário de atendimento é de segunda a sexta, 9h–18h." },
  { label: "Encerrar", text: "Posso ajudar em mais alguma coisa? Se não, tenha um bom dia!" },
];

export function MessageInput({
  threadId,
  thread,
  onAgentMessageSent,
}: {
  threadId: string | null;
  thread?: WaInboxThreadRow | null;
  /** Chamado após envio bem-sucedido de mensagem humana (limpa banner de acção, etc.). */
  onAgentMessageSent?: () => void;
}) {
  const [text, setText] = useState("");
  const [retryText, setRetryText] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const qc = useQueryClient();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: waLines = [] } = useQuery({
    queryKey: INBOX_QK.phoneLines,
    queryFn: fetchTenantWhatsappLines,
    staleTime: 60_000,
  });
  const outboundEnabled = useMemo(
    () => isWhatsappOutboundEnabledForThread(waLines, thread?.businessPhoneNumberId),
    [waLines, thread?.businessPhoneNumberId]
  );
  const composerLocked = Boolean(threadId && thread && !outboundEnabled);

  const { data: typingUsers } = useQuery({
    queryKey: threadId ? INBOX_QK.typing(threadId) : (["inbox-typing", "none"] as const),
    queryFn: () => [] as Array<{ userId: string; name?: string }>,
    initialData: [] as Array<{ userId: string; name?: string }>,
    staleTime: Number.POSITIVE_INFINITY,
    enabled: Boolean(threadId),
  });
  const typingList = Array.isArray(typingUsers) ? typingUsers : [];

  const suggestMut = useMutation({
    mutationFn: (tid: string) => fetchSuggestedReply(tid),
    onSuccess: (data) => setAiPreview(data.text),
  });

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
      if (vars.tid) qc.invalidateQueries({ queryKey: INBOX_QK.thread(vars.tid) });
    },
    onSuccess: () => {
      setText("");
      setRetryText(null);
      setAiPreview(null);
      markFirstReplySent();
      onAgentMessageSent?.();
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
    if (!threadId || !text.trim() || mutation.isPending || composerLocked) return;
    reportTyping(threadId, false);
    mutation.mutate({ tid: threadId, body: text.trim() });
  }, [threadId, text, mutation, composerLocked]);

  const applyTemplate = (tpl: string) => {
    const name = thread?.contactName?.trim();
    const personalized = name ? tpl.replace(/\{\{nome\}\}/g, name) : tpl;
    setText((prev) => (prev ? `${prev.trim()}\n\n${personalized}` : personalized));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!threadId) {
    return (
      <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-6 text-center">
        <p className="df-text-muted">Escolha uma conversa para responder.</p>
      </div>
    );
  }

  return (
    <div
      id="inbox-composer-anchor"
      className="border-t border-slate-100 bg-white px-4 pb-4 pt-3 shadow-[0_-8px_32px_rgba(15,23,42,0.03)] sm:px-5 sm:pb-5 sm:pt-4"
      data-testid="message-input"
    >
      {composerLocked ? (
        <p
          className="mb-3 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-xs text-amber-950"
          title={OUTBOUND_LOCKED_HINT}
        >
          Envio e sugestões com IA ficam disponíveis quando o canal WhatsApp estiver ativo na Meta.
        </p>
      ) : null}

      {typingList.length > 0 && (
        <p className="mb-2 px-0.5 text-xs text-slate-500">
          <span className="italic">
            {typingList.map((t) => t.name || t.userId).join(", ")}
            {typingList.length === 1 ? " está a escrever…" : " estão a escrever…"}
          </span>
        </p>
      )}
      {thread && followUpSuggestion(thread)?.show ? (
        <div
          className="mb-3 rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950 shadow-sm"
          data-testid="follow-up-banner"
        >
          <p className="font-medium">Follow-up sugerido</p>
          <p className="mt-1 text-xs text-amber-900/85">
            O cliente ainda não respondeu após a última mensagem sua — pode enviar um lembrete cordial.
          </p>
          <button
            type="button"
            className={`${buttonClassName("secondary")} mt-2 text-xs`}
            onClick={async () => {
              const fu = followUpSuggestion(thread);
              if (!fu?.show) return;
              setText(fu.suggestedText);
              void logFollowUpUse(threadId);
              await qc.invalidateQueries({ queryKey: INBOX_QK.audit(threadId) });
            }}
          >
            Usar texto sugerido
          </button>
        </div>
      ) : null}

      {mutation.isError && (
        <div className="df-feedback-danger mb-3 flex flex-wrap items-center gap-2">
          <span className="font-medium">Não enviámos a mensagem.</span>
          {retryText ? (
            <button
              type="button"
              className="font-semibold text-red-900 underline decoration-red-300 underline-offset-2 hover:decoration-red-800"
              onClick={() => {
                if (!threadId) return;
                mutation.reset();
                mutation.mutate({ tid: threadId, body: retryText });
              }}
            >
              Tentar novamente
            </button>
          ) : null}
        </div>
      )}

      <div className="mb-3 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Respostas rápidas</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              disabled={composerLocked}
              title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
              className="df-inbox-template-chip"
              onClick={() => applyTemplate(t.text)}
              data-testid={`template-${t.label}`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            disabled={composerLocked || suggestMut.isPending || mutation.isPending}
            title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
            className="df-inbox-ai-chip"
            onClick={() => suggestMut.mutate(threadId)}
            data-testid="btn-ai-suggest"
          >
            {suggestMut.isPending ? "A gerar…" : "Gerar com IA"}
          </button>
        </div>
      </div>

      <PlaybookSuggest
        threadId={threadId}
        sendDisabled={mutation.isPending || composerLocked}
        onUseResponse={(t) => setText(t)}
      />

      {suggestMut.isError && (
        <p className="mb-2 text-xs text-red-600">
          {suggestMut.error instanceof Error ? suggestMut.error.message : "Erro ao gerar sugestão"}
        </p>
      )}

      {aiPreview !== null && (
        <div className="df-panel-ai-preview mb-3 transition-all duration-200" data-testid="ai-preview">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-900">
            Pré-visualização (IA)
          </p>
          <p className="mt-2 whitespace-pre-wrap text-slate-800">{aiPreview}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClassName("primary")}
              onClick={() => {
                setText(aiPreview);
                setAiPreview(null);
              }}
            >
              Usar no editor
            </button>
            <button
              type="button"
              className={buttonClassName("secondary")}
              onClick={() => setAiPreview(null)}
            >
              Descartar
            </button>
            <button
              type="button"
              className={buttonClassName("secondary")}
              disabled={mutation.isPending || composerLocked}
              title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
              onClick={() => {
                if (!threadId) return;
                mutation.mutate({ tid: threadId, body: aiPreview });
              }}
            >
              Enviar direto
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="sr-only" htmlFor="inbox-composer">
          Mensagem para o cliente
        </label>
        <textarea
          id="inbox-composer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escreva a mensagem…"
          rows={3}
          disabled={mutation.isPending || composerLocked}
          title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
          className="df-field-control min-h-[5.5rem] flex-1 resize-y text-[15px] leading-relaxed shadow-inner transition-colors duration-200 bg-slate-50/60 focus:bg-white"
        />
        <button
          type="button"
          onClick={send}
          disabled={mutation.isPending || !text.trim() || composerLocked}
          title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
          className="df-inbox-send-primary sm:self-stretch"
          data-testid="send-button"
        >
          {mutation.isPending ? "A enviar…" : "Enviar"}
        </button>
      </div>
      <p className="mt-2 px-0.5 text-[11px] text-slate-400">Enter envia · Shift+Enter nova linha</p>
    </div>
  );
}
