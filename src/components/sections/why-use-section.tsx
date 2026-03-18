import { Zap, ThumbsUp, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

const blocks = [
  {
    icon: Zap,
    title: "Rápido",
    description: "Acesse no navegador, sem instalação. Ferramentas prontas para usar em segundos.",
    color: "text-primary",
    bg: "bg-primary/5 border-primary/20",
  },
  {
    icon: ThumbsUp,
    title: "Útil",
    description: "Resolvem problemas reais: controle financeiro, divisão de contas, consulta de dados.",
    color: "text-blue-600",
    bg: "bg-blue-500/5 border-blue-500/20",
  },
  {
    icon: Link2,
    title: "Integrado ao ecossistema",
    description: "Conectam com nossos produtos. Do Financeiro ao WhatsApp Platform, tudo na mesma casa.",
    color: "text-orange-500",
    bg: "bg-orange-500/5 border-orange-500/20",
  },
];

export function WhyUseSection() {
  return (
    <section
      id="por-que-usar"
      className="py-24 bg-white"
      aria-labelledby="why-use-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="why-use-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Por que usar
          </h2>
          <p className="mt-3 text-slate-600">
            Ferramentas pensadas para o seu dia a dia, dentro do ecossistema DevFlow Labs.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {blocks.map((block) => (
            <article
              key={block.title}
              className={cn(
                "rounded-2xl border p-6 text-center",
                "transition-all duration-200 hover:shadow-lg",
                block.bg
              )}
            >
              <div className={cn("mx-auto flex size-12 items-center justify-center rounded-xl border", block.bg)}>
                <block.icon className={cn("size-6", block.color)} aria-hidden />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{block.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{block.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
