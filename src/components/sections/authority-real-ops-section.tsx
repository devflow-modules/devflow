import { Plug, Server, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const points = [
  {
    icon: Plug,
    title: "API de verdade",
    text: "WhatsApp Cloud API da Meta — não é gambiarra de browser nem número clonado.",
  },
  {
    icon: Server,
    title: "Conecta no que você já usa",
    text: "Webhook, fila, handoff: fluxo pensado pra operação que recebe volume.",
  },
  {
    icon: Radio,
    title: "Rodando em produção",
    text: "O mesmo stack que atende cliente real hoje — não slide de vendas.",
  },
];

export function AuthorityRealOpsSection() {
  return (
    <section
      id="autoridade-operacao"
      className="border-y border-border bg-slate-900 py-20 text-white sm:py-24"
      aria-labelledby="authority-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="authority-heading"
            className="text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Construído por quem entende de operação real
          </h2>
          <p className="mt-3 text-sm text-slate-400 sm:text-base">
            Nada de promessa vaga — é integração, API e coisa no ar.
          </p>
        </div>

        <ul className="mt-14 grid gap-6 sm:grid-cols-3" role="list">
          {points.map((p) => (
            <li
              key={p.title}
              className={cn(
                "rounded-2xl border border-white/10 bg-white/5 p-6",
                "transition-colors hover:border-primary/40 hover:bg-white/[0.07]"
              )}
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20">
                <p.icon className="size-6 text-primary" aria-hidden />
              </div>
              <h3 className="mt-4 font-bold text-white">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
