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
      className="border-y border-border bg-slate-900 py-24 text-white sm:py-28"
      aria-labelledby="authority-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="authority-heading"
            className="text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Feito por quem opera de verdade
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
            Infra validada em produção — não protótipo.
          </p>
        </div>

        <ul className="mt-16 grid gap-8 sm:grid-cols-3" role="list">
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
              <h3 className="mt-5 font-bold text-white">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
