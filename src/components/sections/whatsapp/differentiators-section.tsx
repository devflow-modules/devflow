import { Bot, Gauge, LineChart, ShieldCheck, Users } from "lucide-react";
import { Section } from "@/components/layout/Section";

const differentiators = [
  {
    icon: LineChart,
    title: "A equipe distribui a fila",
    description: "A conversa entra na fila. Alguém assume, transfere ou devolve. Sem roteamento por presença, carga ou IA.",
  },
  {
    icon: Bot,
    title: "IA supervisionada",
    description: "Automatize o repetitivo quando a automação está ativa. A equipe fica nos casos que precisam de contexto.",
  },
  {
    icon: Users,
    title: "Mais de uma pessoa atendendo",
    description: "Papéis de operação e gestão. A configuração inicial é acompanhada pela DevFlow.",
  },
  {
    icon: Gauge,
    title: "Visibilidade da operação",
    description: "Veja quem está com a conversa e o que ainda precisa de resposta.",
  },
  {
    icon: ShieldCheck,
    title: "API oficial da Meta",
    description: "WhatsApp Cloud API, sem automação baseada em QR Code ou celular espelhado.",
  },
];

export function DifferentiatorsSection() {
  return (
    <Section alternate aria-labelledby="differentiators-section-heading" className="border-y border-border py-20 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90 sm:text-sm">O que a operação faz</p>
        <h2
          id="differentiators-section-heading"
          className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Inbox, responsável, fila e handoff no mesmo lugar
        </h2>
        <p className="df-text-secondary mx-auto mt-4 max-w-2xl text-base font-semibold leading-snug sm:text-lg">
          A equipe atende junto, vê o contexto e encaminha a conversa quando ela precisa de uma pessoa.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {differentiators.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-border bg-card p-6 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.12)] transition-shadow hover:shadow-[0_16px_48px_-16px_rgba(15,23,42,0.16)]"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10">
              <item.icon className="size-[1.15rem] text-primary" aria-hidden />
            </div>
            <h3 className="mt-5 text-base font-bold tracking-tight text-foreground">{item.title}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
