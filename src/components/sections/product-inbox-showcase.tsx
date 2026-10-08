"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { owner: "Sem responsável", queue: "Precisa resposta", note: "A conversa ainda não tem dono." },
  { owner: "Bruno", queue: "Comercial", note: "Bruno assumiu a conversa." },
  { owner: "Bruno", queue: "Fila · Comercial", note: "A fila leva o contexto junto." },
  { owner: "Carla", queue: "Handoff", note: "Transferido para Carla." },
] as const;

const THREAD = [
  { who: "Cliente", text: "Consigo falar com alguém sobre o pedido?" },
  { who: "Operação", text: "Sim. Vou passar para quem acompanha esse caso." },
] as const;

export function ProductInboxShowcase() {
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    const timer = window.setTimeout(apply, 0);
    media.addEventListener("change", apply);
    return () => {
      window.clearTimeout(timer);
      media.removeEventListener("change", apply);
    };
  }, []);

  useEffect(() => {
    if (reduced || typeof window.matchMedia !== "function") return;
    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % STEPS.length);
    }, 2400);
    return () => window.clearInterval(timer);
  }, [reduced]);

  const frame = reduced ? STEPS[1] : STEPS[step];

  return (
    <div className="df-v2-panel p-4 sm:p-5" aria-hidden={false}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--df-v2-brand)]">
            Demonstração da plataforma
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--df-v2-ink)]">Inbox da equipe</p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--df-v2-border)] bg-[var(--df-v2-surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--df-v2-ink-soft)]">
          Dados ilustrativos
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[var(--df-v2-muted)]">
        Estrutura de uma conversa. Não representa uma operação de cliente.
      </p>

      <div className="mt-4 overflow-hidden rounded-[14px] border border-[var(--df-v2-border)]">
        <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
          <ul className="divide-y divide-[var(--df-v2-border)] bg-[var(--df-v2-surface-muted)]" role="list">
            <li className="df-v2-fill px-3 py-3">
              <p className="truncate text-sm font-semibold text-[var(--df-v2-ink)]">Pedido em aberto</p>
              <p className="mt-1 text-xs text-[var(--df-v2-muted)]">{frame.queue}</p>
            </li>
            <li className="px-3 py-3 opacity-70">
              <p className="truncate text-sm font-medium text-[var(--df-v2-ink)]">Dúvida de status</p>
              <p className="mt-1 text-xs text-[var(--df-v2-muted)]">Automação</p>
            </li>
          </ul>
          <div className="df-v2-fill px-3 py-3 sm:px-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[var(--df-v2-ink)]">Responsável</p>
              <p className="text-xs font-semibold text-[var(--df-v2-brand)]">{frame.owner}</p>
            </div>
            <p className="mt-2 min-h-10 text-sm leading-snug text-[var(--df-v2-ink-soft)]">{frame.note}</p>
            <div className="mt-3 space-y-2">
              {THREAD.map((line) => (
                <p key={line.who} className="text-xs leading-relaxed text-[var(--df-v2-ink-soft)]">
                  <span className="font-semibold text-[var(--df-v2-ink)]">{line.who}. </span>
                  {line.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
