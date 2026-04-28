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
      className="border-y border-border bg-slate-900 py-12 text-white sm:py-16 lg:py-20"
      aria-labelledby="authority-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="authority-heading"
            className="df-text-primary text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Feito por quem opera de verdade
          </h2>
          <p className="df-text-secondary mt-4 text-sm leading-relaxed sm:text-base">
            Infra validada em produção — não protótipo.
          </p>
        </div>

        <ul className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-3 sm:gap-8" role="list">
          {points.map((p) => (
            <li
              key={p.title}
              className={cn(
                "rounded-2xl border border-white/10 bg-white/5 p-7",
                "transition-colors hover:border-primary/35"
              )}
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20">
                <p.icon className="size-6 text-primary" aria-hidden />
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
