"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    owner: "Sem responsável",
    queue: "A definir",
    status: "Precisa resposta",
    note: "A conversa ainda não tem dono.",
  },
  {
    owner: "Bruno",
    queue: "Comercial",
    status: "Em atendimento",
    note: "Bruno assumiu a conversa.",
  },
  {
    owner: "Bruno",
    queue: "Comercial",
    status: "Precisa resposta",
    note: "A fila leva o contexto junto.",
  },
  {
    owner: "Carla",
    queue: "Comercial",
    status: "Transferida",
    note: "Transferido para Carla.",
  },
] as const;

const VIEWS = ["Precisa resposta", "Minhas", "Sem responsável"] as const;

const THREADS = [
  { name: "Mariana", topic: "Pedido em aberto", meta: "", selected: true },
  { name: "João", topic: "Dúvida de entrega", meta: "Sem responsável", selected: false },
  { name: "Ana", topic: "Horário de atendimento", meta: "Bruno", selected: false },
  { name: "Pedro", topic: "Status do pedido", meta: "Carla", selected: false },
] as const;

const MESSAGES = [
  { who: "Mariana", text: "Consigo falar com alguém sobre o pedido?" },
  { who: "Operação", text: "Sim. A conversa fica com quem acompanha esse caso." },
] as const;

export function ProductInboxShowcase() {
  const [step, setStep] = useState(1);
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
    }, 2600);
    return () => window.clearInterval(timer);
  }, [reduced]);

  const frame = reduced ? STEPS[1] : STEPS[step];

  return (
    <figure className="df-v2-panel p-4 sm:p-5">
      <figcaption className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--df-v2-brand)]">
            Demonstração da plataforma
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--df-v2-ink)]">Inbox da equipe</p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--df-v2-border)] bg-[var(--df-v2-surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--df-v2-ink-soft)]">
          Dados ilustrativos
        </span>
      </figcaption>
      <p className="mt-2 text-xs leading-relaxed text-[var(--df-v2-muted)]">
        Exemplo de operação: a conversa começa sem responsável, passa para Bruno na fila Comercial e pode ser
        transferida para Carla. Não representa uma operação de cliente.
      </p>

      <div className="mt-4 overflow-hidden rounded-[14px] border border-[var(--df-v2-border)]" aria-hidden="true">
        <div className="df-v2-fill flex items-center justify-between gap-3 border-b border-[var(--df-v2-border)] px-3 py-2">
          <p className="text-xs font-semibold text-[var(--df-v2-ink)]">Inbox</p>
          <p className="text-[11px] font-medium text-[var(--df-v2-muted)]">Atendimento</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[7.5rem_minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <ul className="flex gap-2 overflow-x-auto border-b border-[var(--df-v2-border)] bg-[var(--df-v2-surface-muted)] p-2 md:flex-col md:gap-1 md:border-b-0 md:border-r" role="list">
            {VIEWS.map((view) => (
              <li
                key={view}
                className={
                  view === "Precisa resposta"
                    ? "df-v2-fill shrink-0 rounded-[10px] px-2.5 py-2 text-xs font-semibold text-[var(--df-v2-ink)]"
                    : "shrink-0 rounded-[10px] px-2.5 py-2 text-xs font-medium text-[var(--df-v2-muted)]"
                }
              >
                {view}
              </li>
            ))}
          </ul>
          <ul className="divide-y divide-[var(--df-v2-border)] border-b border-[var(--df-v2-border)] md:border-b-0 md:border-r" role="list">
            {THREADS.map((thread) => (
              <li key={thread.name} className={thread.selected ? "df-v2-fill px-3 py-2.5" : "px-3 py-2.5"}>
                <p className="truncate text-sm font-semibold text-[var(--df-v2-ink)]">{thread.name}</p>
                <p className="truncate text-xs text-[var(--df-v2-muted)]">{thread.topic}</p>
                <p className="mt-1 text-[11px] font-medium text-[var(--df-v2-ink-soft)]">
                  {thread.selected ? frame.owner : thread.meta}
                </p>
              </li>
            ))}
          </ul>
          <div className="df-v2-fill px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--df-v2-muted)]">
              Pedido em aberto
            </p>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--df-v2-muted)]">Responsável</dt>
                <dd className="font-semibold text-[var(--df-v2-brand)]">{frame.owner}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--df-v2-muted)]">Fila</dt>
                <dd className="font-medium text-[var(--df-v2-ink)]">{frame.queue}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--df-v2-muted)]">Status</dt>
                <dd className="font-medium text-[var(--df-v2-ink)]">{frame.status}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs font-medium leading-relaxed text-[var(--df-v2-ink-soft)]">{frame.note}</p>
            <div className="mt-3 space-y-2 border-t border-[var(--df-v2-border)] pt-3">
              {MESSAGES.map((line) => (
                <p key={line.who} className="text-xs leading-relaxed text-[var(--df-v2-ink-soft)]">
                  <span className="font-semibold text-[var(--df-v2-ink)]">{line.who}. </span>
                  {line.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
