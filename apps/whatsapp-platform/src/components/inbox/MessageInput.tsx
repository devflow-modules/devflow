"use client";

import { memo, useCallback, useRef, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  sendInboxMessage,
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
import { INBOX_CHAT_GUTTER_X, INBOX_CHAT_GUTTER_X_COMPACT } from "./inboxChatLayout";
import { InboxComposerTextField, type InboxComposerHandle } from "./InboxComposerTextField";
import { Button } from "@/components/ui/button";

const OUTBOUND_LOCKED_HINT = "Disponível após ativação do número";

const QUICK_TEMPLATES: { label: string; text: string }[] = [
  { label: "Saudação", text: "Olá! Obrigado pelo contacto. Como posso ajudar?" },
  { label: "Aguardar", text: "Obrigado pela paciência — já verifico e volto já com uma resposta." },
  { label: "Dados", text: "Pode enviar mais detalhes ou um print do ecrã, por favor?" },
  { label: "Horário", text: "O nosso horário de atendimento é de segunda a sexta, 9h–18h." },
  { label: "Encerrar", text: "Posso ajudar em mais alguma coisa? Se não, tenha um bom dia!" },
];

function MessageInputInner({
  threadId,
  thread,
  onAgentMessageSent,
  denseComposer = false,
}: {
  threadId: string | null;
  thread?: WaInboxThreadRow | null;
  /** Chamado após envio bem-sucedido de mensagem humana (limpa banner de acção, etc.). */
  onAgentMessageSent?: () => void;
  /** Menos padding, respostas rápidas recolhíveis — liberta altura para o histórico. */
  denseComposer?: boolean;
}) {
  const [retryText, setRetryText] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const qc = useQueryClient();
  const composerRef = useRef<InboxComposerHandle>(null);

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
      composerRef.current?.clear();
      setRetryText(null);
      setAiPreview(null);
      markFirstReplySent();
      onAgentMessageSent?.();
    },
  });

  const { mutate: sendMessage } = mutation;
  const handleComposerSend = useCallback(
    (body: string) => {
      if (!threadId) return;
      sendMessage({ tid: threadId, body });
    },
    [threadId, sendMessage]
  );

  const applyTemplate = useCallback(
    (tpl: string) => {
      const name = thread?.contactName?.trim();
      const personalized = name ? tpl.replace(/\{\{nome\}\}/g, name) : tpl;
      composerRef.current?.appendText(personalized);
    },
    [thread?.contactName]
  );

  const handlePlaybookUse = useCallback((t: string) => {
    composerRef.current?.setText(t);
  }, []);

  const handleAiPreviewUseInEditor = useCallback(() => {
    if (aiPreview === null) return;
    composerRef.current?.setText(aiPreview);
    setAiPreview(null);
  }, [aiPreview]);

  if (!threadId) {
    return (
      <div className={`border-t border-border bg-muted/60/50 py-6 text-center ${INBOX_CHAT_GUTTER_X}`}>
        <p className="df-text-muted">Escolha uma conversa para responder.</p>
      </div>
    );
  }

  return (
    <div
      id="inbox-composer-anchor"
      className={`shrink-0 rounded-t-2xl border-t border-border/90 bg-card shadow-[0_-10px_36px_rgba(15,23,42,0.045)] ${
        denseComposer
          ? `${INBOX_CHAT_GUTTER_X_COMPACT} pb-2.5 pt-2 sm:pb-3 sm:pt-2.5`
          : `${INBOX_CHAT_GUTTER_X} pb-4 pt-3.5 sm:pb-5 sm:pt-4`
      }`}
      data-testid="message-input"
    >
      {composerLocked ? (
        <p
          className="df-feedback-warning mb-3 rounded-lg px-3 py-2 text-xs"
          title={OUTBOUND_LOCKED_HINT}
        >
          Envio e sugestões com IA ficam disponíveis quando o canal WhatsApp estiver ativo na Meta.
        </p>
      ) : null}

      {typingList.length > 0 && (
        <p className="mb-2 px-0.5 text-xs df-text-muted">
          <span className="italic">
            {typingList.map((t) => t.name || t.userId).join(", ")}
            {typingList.length === 1 ? " está a escrever…" : " estão a escrever…"}
          </span>
        </p>
      )}
      {thread && followUpSuggestion(thread)?.show ? (
        <div className="df-feedback-warning mb-3 rounded-xl px-3 py-2.5 text-sm shadow-sm" data-testid="follow-up-banner">
          <p className="font-medium">Follow-up sugerido</p>
          <p className="mt-1 text-xs opacity-90">
            O cliente ainda não respondeu após a última mensagem sua — pode enviar um lembrete cordial.
          </p>
          <Button variant="secondary"
            type="button"
            className={`${buttonClassName("secondary")} mt-2 text-xs`}
            onClick={async () => {
              const fu = followUpSuggestion(thread);
              if (!fu?.show) return;
              composerRef.current?.setText(fu.suggestedText);
              void logFollowUpUse(threadId);
              await qc.invalidateQueries({ queryKey: INBOX_QK.audit(threadId) });
            }}
          >
            Usar texto sugerido
          </Button>
        </div>
      ) : null}

      {mutation.isError && (
        <div className="df-feedback-danger mb-3 flex flex-wrap items-center gap-2">
          <span className="font-medium">Não enviámos a mensagem.</span>
          {retryText ? (
            <Button variant="secondary"
              type="button"
              className="font-semibold text-red-900 underline decoration-red-300 underline-offset-2 hover:decoration-red-800"
              onClick={() => {
                if (!threadId) return;
                mutation.reset();
                mutation.mutate({ tid: threadId, body: retryText });
              }}
            >
              Tentar novamente
            </Button>
          ) : null}
        </div>
      )}

      {denseComposer ? (
        <details className="mb-2 rounded-lg border border-border/80 bg-muted/60/60">
          <summary className="cursor-pointer list-none px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide df-text-muted marker:content-none [&::-webkit-details-marker]:hidden">
            Respostas rápidas e IA ▾
          </summary>
          <div className="flex flex-wrap gap-1.5 border-t border-border/90 px-2.5 pb-2.5 pt-2">
            {QUICK_TEMPLATES.map((t) => (
              <Button variant="disabled"
                key={t.label}
                type="button"
                disabled={composerLocked}
                title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
                className="df-inbox-template-chip"
                onClick={() => applyTemplate(t.text)}
                data-testid={`template-${t.label}`}
              >
                {t.label}
              </Button>
            ))}
            <Button variant="disabled"
              type="button"
              disabled={composerLocked || suggestMut.isPending || mutation.isPending}
              title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
              className="df-inbox-ai-chip"
              onClick={() => suggestMut.mutate(threadId)}
              data-testid="btn-ai-suggest"
            >
              {suggestMut.isPending ? "A gerar…" : "Gerar com IA"}
            </Button>
          </div>
        </details>
      ) : (
        <div className="mb-3 rounded-xl border border-border/80 bg-muted/60/60 px-3 py-2.5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide df-text-muted">Respostas rápidas</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_TEMPLATES.map((t) => (
              <Button variant="disabled"
                key={t.label}
                type="button"
                disabled={composerLocked}
                title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
                className="df-inbox-template-chip"
                onClick={() => applyTemplate(t.text)}
                data-testid={`template-${t.label}`}
              >
                {t.label}
              </Button>
            ))}
            <Button variant="disabled"
              type="button"
              disabled={composerLocked || suggestMut.isPending || mutation.isPending}
              title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
              className="df-inbox-ai-chip"
              onClick={() => suggestMut.mutate(threadId)}
              data-testid="btn-ai-suggest"
            >
              {suggestMut.isPending ? "A gerar…" : "Gerar com IA"}
            </Button>
          </div>
        </div>
      )}

      {denseComposer ? (
        <details className="mb-2">
          <summary className="df-text-info cursor-pointer text-[11px] font-medium marker:content-none [&::-webkit-details-marker]:hidden">
            Sugerir ação (playbook)
          </summary>
          <div className="mt-1">
            <PlaybookSuggest
              threadId={threadId}
              sendDisabled={mutation.isPending || composerLocked}
              onUseResponse={handlePlaybookUse}
            />
          </div>
        </details>
      ) : (
        <PlaybookSuggest
          threadId={threadId}
          sendDisabled={mutation.isPending || composerLocked}
          onUseResponse={handlePlaybookUse}
        />
      )}

      {suggestMut.isError && (
        <p className="df-text-error mb-2 text-xs">
          {suggestMut.error instanceof Error ? suggestMut.error.message : "Erro ao gerar sugestão"}
        </p>
      )}

      {aiPreview !== null && (
        <div className="df-panel-ai-preview mb-3 transition-all duration-200" data-testid="ai-preview">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-900">
            Pré-visualização (IA)
          </p>
          <p className="mt-2 whitespace-pre-wrap df-text-primary">{aiPreview}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" type="button" className={buttonClassName("primary")} onClick={handleAiPreviewUseInEditor}>
              Usar no editor
            </Button>
            <Button variant="secondary" type="button" className={buttonClassName("secondary")} onClick={() => setAiPreview(null)}>
              Descartar
            </Button>
            <Button variant="disabled"
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
            </Button>
          </div>
        </div>
      )}

      <InboxComposerTextField
        key={threadId}
        ref={composerRef}
        threadId={threadId}
        denseComposer={denseComposer}
        composerLocked={composerLocked}
        sendDisabled={mutation.isPending}
        onSend={handleComposerSend}
      />
    </div>
  );
}

export const MessageInput = memo(MessageInputInner);
