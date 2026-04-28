import Link from "next/link";
import { ArrowRight, Layers, Settings2, Rocket } from "lucide-react";
import { PRIMARY_DEMO_HREF } from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: Layers,
    number: "01",
    title: "Escolhe o que tá te travando",
    description: "Grátis na hora — ou produto se for escalar.",
  },
  {
    icon: Settings2,
    number: "02",
    title: "Abre e usa",
    description: "Browser. Sem instalar. Pago = onboarding rápido.",
  },
  {
    icon: Rocket,
    number: "03",
    title: "Entra no fluxo",
    description: "WhatsApp, grana, CNPJ — fluxo no lugar.",
  },
];

export function HowItWorksHub() {
  return (
    <section
      id="como-funciona-hub"
      className="border-y df-border-brand bg-[var(--devflow-surface)] py-16 sm:py-20"
      aria-labelledby="how-it-works-hub-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <p className="df-text-secondary text-sm">Agora que você entendeu o mapa:</p>
          <h2
            id="how-it-works-hub-heading"
            className="df-text-primary mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Como funciona
          </h2>
          <p className="df-text-secondary mt-4 leading-relaxed">
            Três passos. Direto ao ponto.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className={cn(
                "relative rounded-2xl border border-border bg-card p-7",
                "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              )}
            >
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

              <h3 className="df-text-primary mt-4 font-semibold">{step.title}</h3>
              <p className="df-text-secondary mt-2 text-sm leading-relaxed">{step.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href={PRIMARY_DEMO_HREF}
            aria-label="Ver demonstração guiada no WhatsApp"
            className="inline-flex max-w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-center text-sm font-bold leading-snug text-primary-foreground shadow-[0_4px_14px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02] hover:bg-[#16a34a] sm:px-7 sm:text-base"
          >
            Ver demo
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
          <Link
            href="/produtos/whatsapp-platform"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Ver produto completo
          </Link>
        </div>
      </div>
    </section>
  );
}
