"use client";

import { memo, useCallback, useState } from "react";
import type { WaInboxMessageRow } from "./inboxTypes";
import { getOutboundKindFromMessage } from "./messageOutboundKind";
import { MessageOriginBadge } from "./MessageOriginBadge";
import { isNonTextMessage, MessageMediaPreview } from "./messageMediaPreview";
import { Button } from "@/components/ui/button";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

type DeliveryStatusKind = "failed" | "read" | "delivered" | "sent";

const DELIVERY_STATUS: Record<
  DeliveryStatusKind,
  { label: string; glyph: string; className: string }
> = {
  failed: {
    label: "Falhou",
    glyph: "!",
    className: "df-delivery-status df-delivery-status--failed",
  },
  read: {
    label: "Lida",
    glyph: "✓✓",
    className: "df-delivery-status df-delivery-status--read",
  },
  delivered: {
    label: "Entregue",
    glyph: "✓✓",
    className: "df-delivery-status df-delivery-status--delivered",
  },
  sent: {
    label: "Enviada",
    glyph: "✓",
    className: "df-delivery-status df-delivery-status--sent",
  },
};

function resolveDeliveryStatus(status: string): DeliveryStatusKind | null {
  const s = status.toUpperCase();
  if (s === "FAILED") return "failed";
  if (s === "READ") return "read";
  if (s === "DELIVERED") return "delivered";
  if (s === "SENT" || s === "RECEIVED") return "sent";
  return null;
}

function DeliveryStatus({ status, outbound }: { status: string; outbound: boolean }) {
  const kind = resolveDeliveryStatus(status);
  if (!kind) return null;
  const meta = DELIVERY_STATUS[kind];
  return (
    <span
      className={`${meta.className}${outbound ? " df-delivery-status--outbound" : ""}`}
      aria-label={`Estado: ${meta.label}`}
      data-testid={`delivery-status-${kind}`}
    >
      <span aria-hidden className="df-delivery-status-glyph">
        {meta.glyph}
      </span>
      <span className="df-delivery-status-label">{meta.label}</span>
    </span>
  );
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
      <p className="text-[11px] font-medium text-white/90">Não foi entregue — reenvie pelo compositor.</p>
      <Button variant="secondary"
        type="button"
        onClick={onCopy}
        className="mt-1 min-h-8 text-[11px] font-semibold text-white underline decoration-white/40 underline-offset-2 hover:decoration-white"
        data-testid="msg-failed-copy"
      >
        {copied ? "Texto copiado" : "Copiar texto da mensagem"}
      </Button>
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
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--df-msg-inbound-meta)]">Cliente</span>
            {typeLabel ? (
              <span className="df-inbox-list-chip rounded bg-[var(--df-brand-100)] px-1.5 py-0.5 font-semibold uppercase tracking-wide text-[var(--df-brand-900)]">
                {typeLabel}
              </span>
            ) : null}
          </div>
        )}
        {outbound && !compact && (
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/75">
              {outboundKind === "ai"
                ? "Assistente IA"
                : outboundKind === "automation"
                  ? "Sistema"
                  : outboundKind === "agent"
                    ? "Operador"
                    : "Equipa"}
            </span>
            {typeLabel ? (
              <span className="df-inbox-list-chip rounded bg-card/15 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-white/90">
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
            className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${outbound ? "text-white" : "text-[var(--df-msg-inbound-fg)]"} ${hasMedia ? "mt-1" : ""}`}
          >
            {textBody}
          </p>
        ) : null}

        {!showText && !hasMedia ? (
          <p className={`text-sm italic ${outbound ? "text-white/80" : "text-[var(--df-msg-inbound-meta)]"}`}>
            [{message.messageType}]
          </p>
        ) : null}

        <div
          className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] ${
            outbound ? "justify-end text-white/85" : "justify-start text-[var(--df-msg-inbound-meta)]"
          }`}
        >
          {outbound && outboundKind && !pendingOptimistic ? <MessageOriginBadge kind={outboundKind} /> : null}
          <span className="tabular-nums opacity-90">{formatTime(message.ts)}</span>
          {outbound && pendingOptimistic ? (
            <span className="text-[11px] italic opacity-90" data-testid="msg-pending" aria-label="A enviar">
              A enviar…
            </span>
          ) : outbound ? (
            <DeliveryStatus status={message.status} outbound />
          ) : null}
        </div>
        {outbound && failed && !pendingOptimistic && message.errorMessage ? (
          <p className="mt-2 text-[11px] leading-snug df-text-error" data-testid="msg-failed-reason">
            {message.errorMessage}
          </p>
        ) : null}
        {outbound && failed && !pendingOptimistic && showText ? <FailedResendHint textBody={textBody} /> : null}
      </div>
    </div>
  );
});
