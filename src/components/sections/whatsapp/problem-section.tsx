import { AlertTriangle, Clock3, Layers, TrendingDown, Users } from "lucide-react";
import { Section } from "@/components/layout/Section";

const problems = [
  {
    icon: Clock3,
    title: "Resposta lenta = deal morto",
    description: "Lead esfria em minutos. Quem demora perde para quem responde na hora.",
  },
  {
    icon: TrendingDown,
    title: "Dinheiro escondido na fila",
    description: "Alto ticket mistura com ruído e some. Você nem sabe quanto deixou na mesa.",
  },
  {
    icon: Layers,
    title: "Caos em mil conversas",
    description: "Sem padrão, sem histórico único, sem dono. Cada atendente vira ilha.",
  },
  {
    icon: AlertTriangle,
    title: "Gestão no escuro",
    description: "Sem SLA, score e conversão visíveis, você gerencia no improviso.",
  },
  {
    icon: Users,
    title: "Escala = contratar em pânico",
    description: "Mais gente para CTRL+C / CTRL+V. Custo sobe, margem sangra.",
  },
];

export function ProblemSection() {
  return (
    <Section aria-labelledby="problem-section-heading" className="py-20 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90 sm:text-sm">Dói no bolso</p>
        <h2
          id="problem-section-heading"
          className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Seu WhatsApp vende, mas a operação manual drena receita
        </h2>
        <p className="mt-4 text-base font-semibold leading-snug text-slate-700 sm:text-lg">
          Suporte, vendas ou pós-venda: quando o volume sobe, quem não tem sistema perde velocidade — e perde venda.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {problems.map((problem) => (
          <article
            key={problem.title}
            className="rounded-2xl border border-border bg-card p-6 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.1)]"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-destructive/10">
              <problem.icon className="size-4 text-destructive" aria-hidden />
            </div>
            <h3 className="mt-5 text-base font-bold tracking-tight text-foreground">{problem.title}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{problem.description}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
