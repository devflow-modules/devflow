"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { reportTyping } from "./inboxFetch";

const TYPING_DEBOUNCE_MS = 400;
const TYPING_STOP_DELAY_MS = 1500;

const OUTBOUND_LOCKED_HINT = "Disponível após ativação do número";

export type InboxComposerHandle = {
  setText: (value: string) => void;
  appendText: (value: string) => void;
  clear: () => void;
};

type Props = {
  threadId: string;
  denseComposer: boolean;
  composerLocked: boolean;
  sendDisabled: boolean;
  onSend: (body: string) => void;
};

/**
 * Apenas textarea + enviar + efeito de typing. Estado de texto isolado para não re-renderizar
 * o resto de MessageInput a cada tecla (INP).
 */
const InboxComposerTextFieldInner = forwardRef<InboxComposerHandle, Props>(function InboxComposerTextField(
  { threadId, denseComposer, composerLocked, sendDisabled, onSend },
  ref
) {
  const [text, setText] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      setText: (value: string) => setText(value),
      appendText: (value: string) =>
        setText((prev) => (prev ? `${prev.trim()}\n\n${value}` : value)),
      clear: () => setText(""),
    }),
    []
  );

  useEffect(() => {
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
    if (!text.trim() || sendDisabled || composerLocked) return;
    reportTyping(threadId, false);
    onSend(text.trim());
  }, [text, sendDisabled, composerLocked, threadId, onSend]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send]
  );

  return (
    <>
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
          rows={denseComposer ? 2 : 3}
          disabled={sendDisabled || composerLocked}
          title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
          className={`df-field-control flex-1 resize-y text-[15px] leading-relaxed shadow-inner transition-colors duration-200 bg-slate-50/60 focus:bg-white ${
            denseComposer ? "min-h-[4.25rem]" : "min-h-[5.5rem]"
          }`}
        />
        <button
          type="button"
          onClick={send}
          disabled={sendDisabled || !text.trim() || composerLocked}
          title={composerLocked ? OUTBOUND_LOCKED_HINT : undefined}
          className="df-inbox-send-primary sm:self-stretch"
          data-testid="send-button"
        >
          {sendDisabled ? "A enviar…" : "Enviar"}
        </button>
      </div>
      <p className={`px-0.5 text-[11px] text-slate-400 ${denseComposer ? "mt-1" : "mt-2"}`}>
        Enter envia · Shift+Enter nova linha
      </p>
    </>
  );
});

export const InboxComposerTextField = memo(InboxComposerTextFieldInner);
