import { Building2, Handshake, Shield } from "lucide-react";
import { Section } from "@/components/layout/Section";

const positioningPillars = [
  {
    icon: Building2,
    title: "A equipe no mesmo inbox",
    description: "Mais de uma pessoa atende, com responsável, fila e histórico compartilhado.",
  },
  {
    icon: Handshake,
    title: "Implantação acompanhada",
    description: "Diagnóstico, desenho dos fluxos e configuração da equipe com a DevFlow.",
  },
];

export function PositioningSection() {
  return (
    <Section alternate aria-labelledby="positioning-section-heading" className="border-y border-border py-20 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90 sm:text-sm">Como entra em operação</p>
        <h2
          id="positioning-section-heading"
          className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          A operação fica com a sua equipe. A implantação começa com a DevFlow.
        </h2>
        <p className="df-text-secondary mt-4 text-base font-semibold leading-snug sm:text-lg">
          A equipe distribui e transfere conversas dentro das filas. O número e os fluxos são configurados na implantação acompanhada.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-2">
        {positioningPillars.map((pillar) => (
          <article
            key={pillar.title}
            className="rounded-2xl border border-border bg-card p-6 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.1)] sm:p-7"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <pillar.icon className="size-5 text-primary" aria-hidden />
            </div>
            <h3 className="mt-5 text-lg font-bold tracking-tight text-foreground">{pillar.title}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
          </article>
        ))}
      </div>

      <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-[0_12px_40px_-18px_rgba(15,23,42,0.1)] sm:p-7">
        <p className="inline-flex items-center gap-2 font-bold text-foreground">
          <Shield className="size-4 text-primary" aria-hidden />
          O que dá para acompanhar hoje
        </p>
        <p className="df-text-secondary mt-2.5 font-semibold leading-snug">
          Quem está com a conversa, o que ainda precisa de resposta e o histórico entre atendentes.
        </p>
      </div>
    </Section>
  );
}
