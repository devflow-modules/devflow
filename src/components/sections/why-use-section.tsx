import { Zap, ThumbsUp, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

const blocks = [
  {
    icon: Zap,
    title: "Rápido",
    description: "Acesse no navegador, sem instalação. Ferramentas prontas para usar em segundos.",
    color: "df-status-brand",
    bg: "df-bg-brand-soft",
  },
  {
    icon: ThumbsUp,
    title: "Útil",
    description: "Resolvem problemas reais: controle financeiro, divisão de contas, consulta de dados.",
    color: "df-status-info",
    bg: "df-bg-info-soft",
  },
  {
    icon: Link2,
    title: "Integrado ao ecossistema",
    description: "Conectam com nossos produtos. Do Financeiro ao WhatsApp Platform, tudo na mesma casa.",
    color: "df-text-secondary",
    bg: "bg-muted/30 border df-border-brand",
  },
];

export function WhyUseSection() {
  return (
    <section
      id="por-que-usar"
      className="df-light py-24"
      aria-labelledby="why-use-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-[var(--devflow-brand)]" aria-hidden />
          <h2 id="why-use-heading" className="df-text-primary text-2xl font-semibold tracking-tight sm:text-3xl">
            Por que usar
          </h2>
          <p className="df-text-secondary mt-3">
            Ferramentas pensadas para o seu dia a dia, dentro do ecossistema DevFlow Labs.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {blocks.map((block) => (
            <article
              key={block.title}
              className={cn(
                "df-surface-elevated rounded-2xl p-6 text-center",
                "transition-all duration-200 hover:shadow-[0_16px_48px_-20px_rgba(0,0,0,0.28)]",
                block.bg
              )}
            >
              <div className={cn("mx-auto flex size-12 items-center justify-center rounded-xl border", block.bg)}>
                <block.icon className={cn("size-6", block.color)} aria-hidden />
              </div>
              <h3 className="df-text-primary mt-4 font-semibold">{block.title}</h3>
              <p className="df-text-secondary mt-2 text-sm">{block.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
