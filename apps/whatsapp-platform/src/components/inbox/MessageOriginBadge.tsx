"use client";

import type { OutboundUiKind } from "./messageOutboundKind";

const META: Record<
  NonNullable<OutboundUiKind>,
  { emoji: string; short: string; title: string }
> = {
  ai: {
    emoji: "🤖",
    short: "IA",
    title: "Resposta automática da IA — o operador pode complementar se necessário.",
  },
  automation: {
    emoji: "⚡",
    short: "Automação",
    title: "Mensagem enviada por regra ou fluxo automático (ex.: follow-up).",
  },
  agent: {
    emoji: "👤",
    short: "Humano",
    title: "Enviado por um agente na plataforma.",
  },
};

export function MessageOriginBadge({ kind }: { kind: NonNullable<OutboundUiKind> }) {
  const m = META[kind];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-white/25 bg-card/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/95 backdrop-blur-[2px]"
      title={m.title}
    >
      <span aria-hidden>{m.emoji}</span>
      <span>{m.short}</span>
    </span>
  );
}
