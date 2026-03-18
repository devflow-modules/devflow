import Link from "next/link";
import { ArrowRight, Layers, Settings2, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: Layers,
    number: "01",
    title: "Escolhe o que tá te travando",
    description:
      "Ferramenta grátis pra resolver na hora, ou produto pago se você precisa escalar de verdade.",
  },
  {
    icon: Settings2,
    number: "02",
    title: "Abre e usa",
    description:
      "Sem instalação. No browser mesmo. O que for pago, o onboarding é rápido — sem enrolação.",
  },
  {
    icon: Rocket,
    number: "03",
    title: "Entra no fluxo",
    description:
      "WhatsApp respondendo, financeiro organizado, CNPJ na mão. Menos retrabalho, mais execução.",
  },
];

export function HowItWorksHub() {
  return (
    <section
      id="como-funciona-hub"
      className="bg-white py-24"
      aria-labelledby="how-it-works-hub-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="how-it-works-hub-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Como funciona
          </h2>
          <p className="mt-3 text-slate-600">
            Três passos. Sem teoria demais.
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

        <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/ferramentas"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-bold text-primary-foreground shadow-[0_4px_14px_rgba(34,197,94,0.3)] transition-all hover:bg-[#16a34a]"
          >
            Começar agora (leva menos de 1 min)
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
          <Link
            href="/automacao-whatsapp"
            className="text-sm font-bold text-primary hover:underline"
          >
            Ver automação WhatsApp
          </Link>
        </div>
      </div>
    </section>
  );
}
