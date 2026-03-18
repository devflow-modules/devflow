import { Layers, Settings2, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: Layers,
    number: "01",
    title: "Escolha a ferramenta ou produto",
    description:
      "Acesse o hub de ferramentas gratuitas ou explore nossos produtos SaaS. Cada solução foi feita para um problema real.",
  },
  {
    icon: Settings2,
    number: "02",
    title: "Configure rapidamente",
    description:
      "Sem instalação complexa. As ferramentas funcionam no browser; os produtos têm onboarding guiado em minutos.",
  },
  {
    icon: Rocket,
    number: "03",
    title: "Use no dia a dia",
    description:
      "Automatize atendimento, controle finanças, consulte dados. Tudo integrado no ecossistema DevFlow Labs.",
  },
];

export function HowItWorksHub() {
  return (
    <section
      id="como-funciona-hub"
      className="py-24 bg-white"
      aria-labelledby="how-it-works-hub-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="how-it-works-hub-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Como funciona
          </h2>
          <p className="mt-3 text-slate-600">
            Três passos para começar a usar o ecossistema DevFlow Labs.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className={cn(
                "relative rounded-2xl border border-border bg-card p-6",
                "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              )}
            >
              {/* Linha conectora */}
              {index < steps.length - 1 && (
                <div
                  className="absolute -right-3 top-10 hidden h-0.5 w-6 bg-gradient-to-r from-primary/30 to-transparent sm:block"
                  aria-hidden
                />
              )}

              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/5">
                  <step.icon className="size-5 text-primary" aria-hidden />
                </div>
                <span className="text-2xl font-bold text-primary/20">{step.number}</span>
              </div>

              <h3 className="mt-4 font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
