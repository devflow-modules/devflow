import Link from "next/link";
import { ArrowRight, ArrowRightLeft, Bot, Gauge, Layers3 } from "lucide-react";
import { Section } from "@/components/layout/Section";
import { PRIMARY_DEMO_CTA_LABEL } from "@/lib/conversion-copy";

const solutions = [
  {
    icon: Layers3,
    title: "Um cockpit só",
    description: "Tudo que importa num inbox: contexto, dono e histórico — sem dispersão.",
  },
  {
    icon: Gauge,
    title: "Prioridade = ticket",
    description: "Score e regras empurram o deal quente pra cima. O resto espera na fila certa.",
  },
  {
    icon: Bot,
    title: "IA que trabalha pesado",
    description: "Responde o repetitivo na hora. Só chama humano quando tem peixe grande.",
  },
  {
    icon: ArrowRightLeft,
    title: "Handoff sem drama",
    description: "Passa pro humano com contexto completo. Zero “me explica de novo”.",
  },
];

export function SolutionSection() {
  return (
    <Section alternate aria-labelledby="solution-section-heading" className="border-y border-border py-20 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90 sm:text-sm">A virada</p>
          <h2
            id="solution-section-heading"
            className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Troca improviso por máquina de receita no WhatsApp
          </h2>
          <p className="df-text-secondary mt-4 max-w-2xl text-base font-semibold leading-snug sm:text-lg">
            Menos heroísmo, mais processo: fila organizada, automação no lugar certo e número na mesa pra decidir rápido.
          </p>
          <p className="mt-6 text-sm font-bold text-foreground">
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
            >
              {PRIMARY_DEMO_CTA_LABEL}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <span className="mx-2 font-normal text-muted-foreground">·</span>
            <Link
              href="/contato"
              className="inline-flex items-center gap-1.5 font-bold text-foreground underline-offset-4 hover:underline"
            >
              Mandar briefing
            </Link>
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {solutions.map((solution) => (
            <article
              key={solution.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.1)]"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10">
                <solution.icon className="size-[1.1rem] text-primary" aria-hidden />
              </div>
              <h3 className="mt-5 text-base font-bold tracking-tight text-foreground">{solution.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{solution.description}</p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
