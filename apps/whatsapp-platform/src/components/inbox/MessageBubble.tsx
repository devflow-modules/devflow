"use client";

import { memo, useCallback, useState } from "react";
import type { WaInboxMessageRow } from "./inboxTypes";
import { getOutboundKindFromMessage } from "./messageOutboundKind";
import { MessageOriginBadge } from "./MessageOriginBadge";
import { isNonTextMessage, MessageMediaPreview } from "./messageMediaPreview";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function StatusTicks({ status, outbound }: { status: string; outbound: boolean }) {
  const s = status.toUpperCase();
  const fail = (
    <span className={outbound ? "text-amber-200" : "text-red-600"} title="Falha no envio">
      !
    </span>
  );
  if (s === "FAILED") return fail;
  if (s === "READ") {
    return (
      <span className={outbound ? "text-sky-200" : "text-sky-600"} title="Lida">
        ✓✓
      </span>
    );
  }
  if (s === "DELIVERED") {
    return (
      <span className={outbound ? "text-white/55" : "text-slate-400"} title="Entregue">
        ✓✓
      </span>
    );
  }
  if (s === "SENT" || s === "RECEIVED") {
    return (
      <span className={outbound ? "text-white/55" : "text-slate-400"} title="Enviada">
        ✓
      </span>
    );
  }
  return null;
}

function FailedResendHint({ textBody }: { textBody: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(() => {
    void navigator.clipboard.writeText(textBody).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }, [textBody]);

  return (
    <div className="mt-2 rounded-lg border border-white/25 bg-black/10 px-2.5 py-1.5">
      <p className="text-[10px] font-medium text-white/90">Não foi entregue — reenvie pelo compositor.</p>
      <button
        type="button"
        onClick={onCopy}
        className="mt-1 text-[11px] font-semibold text-white underline decoration-white/40 underline-offset-2 hover:decoration-white"
        data-testid="msg-failed-copy"
      >
        {copied ? "Texto copiado" : "Copiar texto da mensagem"}
      </button>
    </div>
  );
}

function messageTypeShort(mt: string): string | null {
  const u = mt.toUpperCase();
  if (u === "TEXT" || u === "UNKNOWN") return null;
  const labels: Record<string, string> = {
    IMAGE: "Imagem",
    AUDIO: "Áudio",
    VOICE: "Áudio",
    VIDEO: "Vídeo",
    DOCUMENT: "Documento",
    STICKER: "Figurinha",
    LOCATION: "Localização",
    CONTACT: "Contacto",
  };
  return labels[u] ?? u;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  compact = false,
}: {
  message: WaInboxMessageRow;
  /** Mensagem seguinte na mesma direção e próxima no tempo (agrupamento visual). */
  compact?: boolean;
}) {
  const outbound = message.direction === "OUTBOUND";
  const pendingOptimistic = message.id.startsWith("optimistic-");
  const hasMedia = isNonTextMessage(message);
  const textBody = message.contentText?.trim() ?? "";
  const showText = textBody.length > 0 && (!hasMedia || textBody !== `[${message.messageType}]`);
  const outboundKind = getOutboundKindFromMessage(message);
  const typeLabel = messageTypeShort(message.messageType);
  const failed = message.status.toUpperCase() === "FAILED";
  /** IA / automação: bolha mais estreita; cliente/operador limitam só na bolha (% do painel). */
  const narrowSystemBubble =
    outbound && (outboundKind === "automation" || outboundKind === "ai");
  const bubbleMaxClass = narrowSystemBubble ? "max-w-[68%]" : "max-w-[80%]";

  const bubbleRadius = compact
    ? outbound
      ? "rounded-2xl rounded-br-md"
      : "rounded-2xl rounded-bl-md"
    : outbound
      ? "rounded-2xl rounded-br-md"
      : "rounded-2xl rounded-bl-md";

  const density = compact ? "px-3 py-2.5" : "px-3.5 py-3 sm:px-4 sm:py-3.5";

  return (
    <div className={`flex w-full ${outbound ? "justify-end" : "justify-start"}`} data-testid="message-bubble">
      <div
        className={`${bubbleMaxClass} ${bubbleRadius} ${density} ${
          outbound ? "df-message-panel-outbound" : "df-message-panel-inbound"
        }`}
      >
        {!outbound && !compact && (
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400/90">Cliente</span>
            {typeLabel ? (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600">
                {typeLabel}
              </span>
            ) : null}
          </div>
        )}
        {outbound && !compact && (
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-white/75">
              {outboundKind === "ai"
                ? "Assistente IA"
                : outboundKind === "automation"
                  ? "Sistema"
                  : outboundKind === "agent"
                    ? "Operador"
                    : "Equipa"}
            </span>
            {typeLabel ? (
              <span className="rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/90">
                {typeLabel}
              </span>
            ) : null}
          </div>
        )}
        {!outbound && compact && <span className="sr-only">Mensagem do cliente</span>}
        {outbound && compact && <span className="sr-only">Mensagem da equipa</span>}

        {hasMedia ? <MessageMediaPreview message={message} outbound={outbound} /> : null}

        {showText ? (
          <p
            className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${outbound ? "text-white" : "text-slate-900"} ${hasMedia ? "mt-1" : ""}`}
          >
            {textBody}
          </p>
        ) : null}

        {!showText && !hasMedia ? (
          <p className={`text-sm italic ${outbound ? "text-white/80" : "text-slate-500"}`}>
            [{message.messageType}]
          </p>
        ) : null}

        <div
          className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] ${
            outbound ? "justify-end text-white/85" : "justify-start text-slate-500"
          }`}
        >
          {outbound && outboundKind && !pendingOptimistic ? <MessageOriginBadge kind={outboundKind} /> : null}
          <span className="tabular-nums opacity-90">{formatTime(message.ts)}</span>
          {outbound && pendingOptimistic ? (
            <span className="text-[10px] italic opacity-90" data-testid="msg-pending">
              A enviar…
            </span>
          ) : outbound ? (
            <StatusTicks status={message.status} outbound />
          ) : null}
        </div>
        {outbound && failed && !pendingOptimistic && message.errorMessage ? (
          <p className="mt-2 text-[11px] leading-snug text-amber-100/95" data-testid="msg-failed-reason">
            {message.errorMessage}
          </p>
        ) : null}
        {outbound && failed && !pendingOptimistic && showText ? <FailedResendHint textBody={textBody} /> : null}
      </div>
    </div>
  );
});
