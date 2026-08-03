"use client";

import { memo, useCallback, useRef, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  sendInboxMessage,
  fetchSuggestedReply,
  logFollowUpUse,
  fetchTenantWhatsappLines,
  isWhatsappOutboundEnabledForThread,
  type SendInboxMessageError,
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

type SendFailureKind = "pre_meta" | "reconcile" | "unknown";

function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const QUICK_TEMPLATES: { label: string; text: string }[] = [
  { label: "Saudação", text: "Olá! Obrigado pelo contacto. Como posso ajudar?" },
  { label: "Aguardar", text: "Obrigado pela paciência — já verifico e volto já com uma resposta." },
  { label: "Dados", text: "Pode enviar mais detalhes ou um print do ecrã, por favor?" },
  { label: "Horário", text: "O nosso horário de atendimento é de segunda a sexta, 9h–18h." },
  { label: "Encerrar", text: "Posso ajudar em mais alguma coisa? Se não, tenha um bom dia!" },
];

type AssistPanel = "templates" | "ai" | "playbook" | null;

/**
 * Fatia 3 — composer-first.
 * PRIMARY: textarea + Enviar.
 * REVEAL: toolbar Templates | IA | Playbook (mutex — uma região por vez).
 */
function MessageInputInner({
  threadId,
  thread,
  onAgentMessageSent,
  denseComposer = false,
  showMobileQuickBar = false,
}: {
  threadId: string | null;
  thread?: WaInboxThreadRow | null;
  /** Chamado após envio bem-sucedido de mensagem humana (limpa banner de acção, etc.). */
  onAgentMessageSent?: () => void;
  /** Menos padding — liberta altura para o histórico. */
  denseComposer?: boolean;
  /** Viewport estreito: textarea um pouco mais alto (sem grelha de 4 CTAs). */
  showMobileQuickBar?: boolean;
}) {
  const [retryText, setRetryText] = useState<string | null>(null);
  const [activeClientRequestId, setActiveClientRequestId] = useState<string | null>(null);
  const [failureKind, setFailureKind] = useState<SendFailureKind | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [assistPanel, setAssistPanel] = useState<AssistPanel>(null);
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
    onSuccess: (data) => {
      setAiPreview(data.text);
      setAssistPanel("ai");
    },
  });

  const mutation = useMutation({
    mutationFn: ({
      tid,
      body,
      clientRequestId,
    }: {
      tid: string;
      body: string;
      clientRequestId: string;
    }) => sendInboxMessage(tid, body, clientRequestId),
    onMutate: async ({ tid, body, clientRequestId }) => {
      setActiveClientRequestId(clientRequestId);
      setFailureKind(null);
      setFailureMessage(null);
      await qc.cancelQueries({ queryKey: INBOX_QK.messages(tid) });
      const prev = qc.getQueryData<WaInboxMessageRow[]>(INBOX_QK.messages(tid));
      const optimistic: WaInboxMessageRow = {
        id: `optimistic-${clientRequestId}`,
        waMessageId: "pending",
        direction: "OUTBOUND",
        fromNumber: "",
        toNumber: "",
        messageType: "TEXT",
        contentText: body,
        contentJson: null,
        ts: new Date().toISOString(),
        status: "PENDING",
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
    onError: (err, vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(INBOX_QK.messages(vars.tid), ctx.prev);
      }
      setRetryText(vars.body);
      setActiveClientRequestId(vars.clientRequestId);
      const sendErr = err as SendInboxMessageError;
      if (sendErr.reconcileOnly || sendErr.code === "SEND_ALREADY_DELIVERED_TO_META") {
        setFailureKind("reconcile");
      } else if (sendErr.retryableMeta === false) {
        setFailureKind("unknown");
      } else {
        setFailureKind("pre_meta");
      }
      setFailureMessage(sendErr.message || "Não foi possível confirmar o envio.");
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: INBOX_QK.messages(vars.tid) });
      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
      if (vars.tid) qc.invalidateQueries({ queryKey: INBOX_QK.thread(vars.tid) });
    },
    onSuccess: () => {
      composerRef.current?.clear();
      setRetryText(null);
      setActiveClientRequestId(null);
      setFailureKind(null);
      setFailureMessage(null);
      setAiPreview(null);
      setAssistPanel(null);
      markFirstReplySent();
      onAgentMessageSent?.();
    },
  });

  const { mutate: sendMessage } = mutation;
  const handleComposerSend = useCallback(
    (body: string) => {
      if (!threadId) return;
      sendMessage({ tid: threadId, body, clientRequestId: newClientRequestId() });
    },
    [threadId, sendMessage]
  );

  const handleRetrySameAttempt = useCallback(() => {
    if (!threadId || !retryText || !activeClientRequestId) return;
    mutation.reset();
    sendMessage({ tid: threadId, body: retryText, clientRequestId: activeClientRequestId });
  }, [threadId, retryText, activeClientRequestId, mutation, sendMessage]);

  const handleForceNewAttempt = useCallback(() => {
    if (!threadId || !retryText) return;
    mutation.reset();
    sendMessage({ tid: threadId, body: retryText, clientRequestId: newClientRequestId() });
  }, [threadId, retryText, mutation, sendMessage]);

  const toggleAssist = useCallback((panel: Exclude<AssistPanel, null>) => {
    setAssistPanel((prev) => (prev === panel ? null : panel));
  }, []);

  const applyTemplate = useCallback(
    (tpl: string) => {
      const name = thread?.contactName?.trim();
      const personalized = name ? tpl.replace(/\{\{nome\}\}/g, name) : tpl;
      composerRef.current?.appendText(personalized);
      composerRef.current?.focus();
    },
    [thread?.contactName]
  );

  const handlePlaybookUse = useCallback((t: string) => {
    composerRef.current?.setText(t);
    setAssistPanel(null);
    composerRef.current?.focus();
  }, []);

  const handleAiPreviewUseInEditor = useCallback(() => {
    if (aiPreview === null) return;
    composerRef.current?.setText(aiPreview);
    setAiPreview(null);
    setAssistPanel(null);
    composerRef.current?.focus();
  }, [aiPreview]);

  const discardAiPreview = useCallback(() => {
    setAiPreview(null);
    setAssistPanel(null);
    composerRef.current?.focus();
  }, []);

  if (!threadId) {
    return (
      <div className={`border-t border-border bg-muted/60/50 py-6 text-center ${INBOX_CHAT_GUTTER_X}`}>
        <p className="df-text-muted">Escolha uma conversa para responder.</p>
      </div>
    );
  }

  const toolbarBtn = denseComposer ? "df-inbox-toolbar-btn-compact" : "df-inbox-toolbar-btn";
  const assistOpen = assistPanel !== null;

  return (
    <div
      id="inbox-composer-anchor"
      className={`shrink-0 rounded-t-2xl border-t border-border/90 bg-card shadow-[0_-10px_36px_rgba(15,23,42,0.045)] ${
        denseComposer
          ? `${INBOX_CHAT_GUTTER_X_COMPACT} max-sm:pb-[max(0.5rem,env(safe-area-inset-bottom))] pb-2 pt-1.5 sm:pb-2.5 sm:pt-2`
          : `${INBOX_CHAT_GUTTER_X} max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] pb-3 pt-2.5 sm:pb-4 sm:pt-3`
      }`}
      data-testid="message-input"
      data-send-state={
        mutation.isPending ? "sending" : failureKind ? "failed" : mutation.isSuccess ? "sent" : "idle"
      }
    >
      {composerLocked ? (
        <p
          className="df-feedback-warning mb-2 rounded-lg px-3 py-2 text-xs"
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
        <div
          className="df-feedback-warning mb-2 flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm shadow-sm"
          data-testid="follow-up-banner"
        >
          <p className="min-w-0 flex-1 text-xs font-medium sm:text-sm">
            Follow-up sugerido — cliente ainda não respondeu após a sua última mensagem.
          </p>
          <Button
            variant="secondary"
            type="button"
            className={`${buttonClassName("secondary")} shrink-0 text-xs`}
            onClick={async () => {
              const fu = followUpSuggestion(thread);
              if (!fu?.show) return;
              composerRef.current?.setText(fu.suggestedText);
              composerRef.current?.focus();
              void logFollowUpUse(threadId);
              await qc.invalidateQueries({ queryKey: INBOX_QK.audit(threadId) });
            }}
          >
            Usar texto sugerido
          </Button>
        </div>
      ) : null}

      {mutation.isPending ? (
        <p className="df-feedback-info mb-2 rounded-lg px-3 py-2 text-xs" data-testid="send-status-sending">
          A enviar…
        </p>
      ) : null}

      {failureKind ? (
        <div
          className="df-feedback-danger mb-2 flex flex-wrap items-center gap-2"
          role="alert"
          data-testid="send-status-failed"
          data-failure-kind={failureKind}
        >
          <span className="font-medium">
            {failureKind === "reconcile"
              ? "A Meta aceitou a mensagem, mas a sincronização falhou."
              : failureKind === "unknown"
                ? "Não confirmámos o resultado do envio."
                : "Não enviámos a mensagem."}
          </span>
          {failureMessage ? <span className="text-xs opacity-90">{failureMessage}</span> : null}
          {retryText && failureKind === "pre_meta" ? (
            <Button
              variant="secondary"
              type="button"
              className="font-semibold text-red-900 underline decoration-red-300 underline-offset-2 hover:decoration-red-800"
              onClick={handleRetrySameAttempt}
              data-testid="send-retry"
            >
              Tentar novamente
            </Button>
          ) : null}
          {retryText && failureKind === "reconcile" ? (
            <Button
              variant="secondary"
              type="button"
              className="font-semibold text-red-900 underline decoration-red-300 underline-offset-2 hover:decoration-red-800"
              onClick={handleRetrySameAttempt}
              data-testid="send-reconcile"
            >
              Tentar sincronizar
            </Button>
          ) : null}
          {retryText && failureKind === "unknown" ? (
            <Button
              variant="secondary"
              type="button"
              className="font-semibold text-red-900 underline decoration-red-300 underline-offset-2 hover:decoration-red-800"
              onClick={handleForceNewAttempt}
              data-testid="send-force-new"
            >
              Nova tentativa (só se tiver a certeza)
            </Button>
          ) : null}
        </div>
      ) : null}

      <InboxComposerTextField
        key={threadId}
        ref={composerRef}
        threadId={threadId}
        denseComposer={denseComposer}
        composerLocked={composerLocked}
        sendDisabled={mutation.isPending}
        onSend={handleComposerSend}
        tallMobile={showMobileQuickBar}
      />

      <div
        className={`mt-2 flex flex-wrap items-center gap-1.5 ${denseComposer ? "gap-1" : ""}`}
        role="toolbar"
        aria-label="Assistências do composer"
        data-testid="composer-assist-toolbar"
      >
        <Button
          variant="secondary"
          type="button"
          className={toolbarBtn}
          aria-expanded={assistPanel === "templates"}
          aria-controls="composer-assist-region"
          disabled={composerLocked}
          title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
          onClick={() => toggleAssist("templates")}
        >
          Templates
        </Button>
        <Button
          variant="secondary"
          type="button"
          className={toolbarBtn}
          aria-expanded={assistPanel === "ai"}
          aria-controls="composer-assist-region"
          disabled={composerLocked || mutation.isPending}
          title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
          onClick={() => toggleAssist("ai")}
        >
          IA
        </Button>
        <Button
          variant="secondary"
          type="button"
          className={toolbarBtn}
          aria-expanded={assistPanel === "playbook"}
          aria-controls="composer-assist-region"
          disabled={composerLocked || mutation.isPending}
          title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
          onClick={() => toggleAssist("playbook")}
        >
          Playbook
        </Button>
      </div>

      {assistOpen ? (
        <div
          id="composer-assist-region"
          className="mt-2 max-h-[min(40vh,16rem)] overflow-y-auto rounded-lg border border-border/80 bg-muted/40 p-2"
          role="region"
          aria-label={
            assistPanel === "templates"
              ? "Respostas rápidas"
              : assistPanel === "ai"
                ? "Assistência de IA"
                : "Playbook"
          }
          data-testid="composer-assist-region"
        >
          {assistPanel === "templates" ? (
            <div className="flex flex-wrap gap-1">
              {QUICK_TEMPLATES.map((t) => (
                <Button
                  variant="secondary"
                  key={t.label}
                  type="button"
                  disabled={composerLocked}
                  title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
                  className="df-inbox-template-chip py-1 text-[10px] sm:text-[11px]"
                  onClick={() => applyTemplate(t.text)}
                  data-testid={`template-${t.label}`}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          ) : null}

          {assistPanel === "ai" ? (
            <div className="space-y-2">
              <Button
                variant="secondary"
                type="button"
                disabled={composerLocked || suggestMut.isPending || mutation.isPending}
                title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
                className="df-inbox-ai-chip py-1 text-[10px] font-semibold sm:text-[11px]"
                onClick={() => suggestMut.mutate(threadId)}
                data-testid="btn-ai-suggest"
              >
                {suggestMut.isPending ? "A gerar…" : "Gerar com IA"}
              </Button>
              {suggestMut.isError ? (
                <p className="df-text-error text-xs" role="alert">
                  {suggestMut.error instanceof Error
                    ? suggestMut.error.message
                    : "Erro ao gerar sugestão"}
                </p>
              ) : null}
              {aiPreview !== null ? (
                <div className="df-panel-ai-preview transition-all duration-200" data-testid="ai-preview">
                  <p className="df-text-info text-[11px] font-semibold uppercase tracking-wide">
                    Pré-visualização (IA)
                  </p>
                  <p className="mt-2 whitespace-pre-wrap df-text-primary">{aiPreview}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      type="button"
                      className={buttonClassName("primary")}
                      onClick={handleAiPreviewUseInEditor}
                    >
                      Usar no editor
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      className={buttonClassName("secondary")}
                      onClick={discardAiPreview}
                    >
                      Descartar
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      className={buttonClassName("secondary")}
                      disabled={mutation.isPending || composerLocked}
                      title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
                      onClick={() => {
                        if (!threadId) return;
                        mutation.mutate({
                          tid: threadId,
                          body: aiPreview,
                          clientRequestId: newClientRequestId(),
                        });
                      }}
                    >
                      Enviar direto
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {assistPanel === "playbook" ? (
            <PlaybookSuggest
              threadId={threadId}
              sendDisabled={mutation.isPending || composerLocked}
              onUseResponse={handlePlaybookUse}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const MessageInput = memo(MessageInputInner);
