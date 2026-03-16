import { MessageCircle, Zap, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: MessageCircle,
    title: "Cliente envia mensagem no WhatsApp",
    description: "O cliente manda a primeira mensagem. O sistema recebe e identifica a intenção.",
  },
  {
    icon: Zap,
    title: "O sistema responde automaticamente",
    description: "Conforme a intenção, a resposta é enviada na hora — sem fila, sem espera.",
  },
  {
    icon: UserRound,
    title: "Encaminha para atendimento humano",
    description: "Quando o cliente pede ou o fluxo exige, o handoff conecta com sua equipe.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="py-24"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="how-it-works-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Como funciona
          </h2>
          <p className="mt-3 text-slate-600">
            Três passos simples da mensagem até o atendimento humano.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className={cn(
                "rounded-xl border border-border bg-card p-6",
                "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              )}
            >
              <div className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/5">
                <step.icon className="size-5 text-primary" aria-hidden />
              </div>
              <p className="mt-4 text-xs font-medium text-accent">
                Passo {index + 1}
              </p>
              <h3 className="mt-1 font-medium text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
