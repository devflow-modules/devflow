import { Plug, Server, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const points = [
  {
    icon: Plug,
    title: "API Meta de verdade",
    text: "Cloud API oficial — não é atalho nem número espelhado.",
  },
  {
    icon: Server,
    title: "Plugado no seu fluxo",
    text: "Webhook, fila, handoff: desenhado pra quem recebe volume.",
  },
  {
    icon: Radio,
    title: "Mesmo código em produção",
    text: "Automações reais ativas hoje — não mockup de apresentação.",
  },
];

export function AuthorityRealOpsSection() {
  return (
    <section
      id="autoridade-operacao"
      className="border-y df-border-brand bg-[var(--devflow-surface)] py-12 sm:py-16 lg:py-20"
      aria-labelledby="authority-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="authority-heading"
            className="df-text-primary text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Operações reais em produção — não mockup de apresentação
          </h2>
          <p className="df-text-secondary mt-4 text-sm leading-relaxed sm:text-base">
            WhatsApp Cloud API oficial, fila priorizada, handoff humano e dashboard operacional.
          </p>
        </div>

        <ul className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-3 sm:gap-8" role="list">
          {points.map((p) => (
            <li
              key={p.title}
              className={cn(
                "df-surface-elevated rounded-2xl p-7",
                "transition-colors hover:border-[color-mix(in_srgb,var(--devflow-brand)_35%,transparent)]"
              )}
            >
              <div className="flex size-11 items-center justify-center rounded-xl df-bg-brand-soft">
                <p.icon className="size-6 df-status-brand" aria-hidden />
              </div>
              <h3 className="df-text-primary mt-5 font-bold">{p.title}</h3>
              <p className="df-text-secondary mt-3 text-sm leading-relaxed">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
