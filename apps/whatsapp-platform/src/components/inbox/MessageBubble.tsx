"use client";

import { memo } from "react";
import type { WaInboxMessageRow } from "./inboxTypes";
import { getOutboundKindFromMessage } from "./messageOutboundKind";
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
  const fail = <span className={outbound ? "text-amber-200" : "text-red-600"} title="Falha">!</span>;
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

function outboundKindLabel(kind: "ai" | "automation" | "agent"): string {
  if (kind === "ai") return "IA";
  if (kind === "automation") return "Automático";
  return "Agente";
}

function OutboundKindBadge({ kind }: { kind: "ai" | "automation" | "agent" }) {
  const dot =
    kind === "ai"
      ? "bg-emerald-300 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
      : kind === "automation"
        ? "bg-amber-300 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
        : "bg-sky-300 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/95 backdrop-blur-[2px]"
      title={
        kind === "ai"
          ? "Resposta gerada por IA"
          : kind === "automation"
            ? "Resposta automática (regras / fluxo de boas-vindas)"
            : "Enviado por um agente humano na plataforma"
      }
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      {outboundKindLabel(kind)}
    </span>
  );
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
  const hasMedia = isNonTextMessage(message);
  const textBody = message.contentText?.trim() ?? "";
  const showText = textBody.length > 0 && (!hasMedia || textBody !== `[${message.messageType}]`);
  const outboundKind = getOutboundKindFromMessage(message);

  const bubbleRadius = compact
    ? outbound
      ? "rounded-2xl rounded-br-md"
      : "rounded-2xl rounded-bl-md"
    : outbound
      ? "rounded-2xl rounded-br-md"
      : "rounded-2xl rounded-bl-md";

  const density = compact ? "px-3 py-2" : "px-3.5 py-2.5";

  return (
    <div className={`flex w-full ${outbound ? "justify-end" : "justify-start"}`} data-testid="message-bubble">
      <div
        className={`max-w-[min(92%,28rem)] ${bubbleRadius} ${density} shadow-[0_1px_3px_rgba(15,23,42,0.06)] ${
          outbound ? "bg-[var(--df-brand-600)] text-white" : "bg-white text-slate-900"
        }`}
      >
        {!outbound && !compact && (
          <div className="mb-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400/90">Cliente</span>
          </div>
        )}
        {!outbound && compact && <span className="sr-only">Mensagem do cliente</span>}

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
          {outbound && outboundKind ? <OutboundKindBadge kind={outboundKind} /> : null}
          <span className="tabular-nums opacity-90">{formatTime(message.ts)}</span>
          {outbound ? <StatusTicks status={message.status} outbound /> : null}
        </div>
      </div>
    </div>
  );
});
