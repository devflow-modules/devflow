import { MessageCircle, ArrowDown, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: MessageCircle,
    title: "Bot atende o início",
    description: "Responde perguntas frequentes e qualifica o lead.",
  },
  {
    icon: ArrowDown,
    title: "Handoff configurável",
    description: "Quando o cliente pede ou o fluxo exige, transfere para humano.",
  },
  {
    icon: UserRound,
    title: "Operação sob controle",
    description: "Você continua no comando. O bot é uma camada, não uma substituição.",
  },
];

export function IntegraHumano() {
  return (
    <section
      id="integra-humano"
      className="py-24"
      aria-labelledby="integra-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="integra-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Integra com operação humana
          </h2>
          <p className="mt-3 text-slate-600">
            Muita gente teme perder controle com bot. Você não perde.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.title}
              className={cn(
                "rounded-xl border border-border bg-card p-6 text-center",
                "transition-all duration-200 hover:border-primary/30"
              )}
            >
              <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                <step.icon className="size-6 text-primary" aria-hidden />
              </div>
              <h3 className="mt-4 font-medium text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
