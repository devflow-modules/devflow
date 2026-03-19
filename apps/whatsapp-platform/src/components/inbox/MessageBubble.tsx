"use client";

import { memo } from "react";
import type { WaInboxMessageRow } from "./inboxTypes";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function StatusTicks({ status }: { status: string }) {
  const s = status.toUpperCase();
  if (s === "FAILED") {
    return <span className="text-red-600" title="Falha">!</span>;
  }
  if (s === "READ") {
    return (
      <span className="text-sky-600" title="Lida">
        ✓✓
      </span>
    );
  }
  if (s === "DELIVERED") {
    return (
      <span className="text-gray-500" title="Entregue">
        ✓✓
      </span>
    );
  }
  if (s === "SENT" || s === "RECEIVED") {
    return (
      <span className="text-gray-400" title="Enviada">
        ✓
      </span>
    );
  }
  return null;
}

export const MessageBubble = memo(function MessageBubble({
  message,
}: {
  message: WaInboxMessageRow;
}) {
  const outbound = message.direction === "OUTBOUND";
  const text = message.contentText?.trim() || `[${message.messageType}]`;

  return (
    <div
      className={`flex w-full ${outbound ? "justify-end" : "justify-start"}`}
      data-testid="message-bubble"
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${
          outbound
            ? "rounded-br-md bg-emerald-100 text-gray-900"
            : "rounded-bl-md bg-gray-100 text-gray-900"
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm">{text}</p>
        <div
          className={`mt-1 flex items-center gap-1 text-[10px] ${
            outbound ? "justify-end text-gray-600" : "text-gray-500"
          }`}
        >
          <span>{formatTime(message.ts)}</span>
          {outbound && <StatusTicks status={message.status} />}
        </div>
      </div>
    </div>
  );
});
