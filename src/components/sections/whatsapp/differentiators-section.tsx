import { Bot, Gauge, LineChart, ShieldCheck, Users } from "lucide-react";
import { Section } from "@/components/layout/Section";

const differentiators = [
  {
    icon: LineChart,
    title: "Score manda na fila",
    description: "Comercial fala primeiro com quem paga — não com quem grita mais alto.",
  },
  {
    icon: Bot,
    title: "Pico vira lucro, não caos",
    description: "IA + regras engolem volume repetitivo sem você contratar às pressas.",
  },
  {
    icon: Users,
    title: "Time alinhado, sem herói",
    description: "Mesmo padrão de resposta em escala — zero dependência de celular pessoal.",
  },
  {
    icon: Gauge,
    title: "Painel manda na operação",
    description: "SLA, gargalo, conversão: ajuste com dado, não com feeling.",
  },
  {
    icon: ShieldCheck,
    title: "Escala com trilho",
    description: "Governança que comprador B2B exige antes de assinar cheque.",
  },
];

export function DifferentiatorsSection() {
  return (
    <Section alternate aria-labelledby="differentiators-section-heading" className="border-y border-border py-20 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90 sm:text-sm">Não é chat. É caixa.</p>
        <h2
          id="differentiators-section-heading"
          className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Operação que imprime ticket: escala, controle e performance no mesmo lugar
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-snug text-slate-700 sm:text-lg">
          Você não compra “mensagem bonita”. Compra velocidade de resposta, prioridade certa e número que sustenta
          meta.
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
