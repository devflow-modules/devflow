import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const stories = [
  {
    antes: "Demorava horas pra organizar tudo",
    depois: "Agora faço em minutos",
    accent: "border-l-primary",
  },
  {
    antes: "Cliente esperando resposta",
    depois: "Automático 24h",
    accent: "border-l-emerald-500",
  },
  {
    antes: "Planilha espalhada",
    depois: "Um painel, visão clara",
    accent: "border-l-blue-500",
  },
];

export function ResultsSocialProofSection() {
  return (
    <section
      id="resultados-reais"
      className="border-y df-border-brand bg-[var(--devflow-background)] py-24 sm:py-28"
      aria-labelledby="results-social-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <TrendingUp className="size-3.5" aria-hidden />
            Antes → depois
          </div>
          <p className="df-text-secondary text-sm leading-relaxed">Na prática, o que muda:</p>
          <h2
            id="results-social-heading"
            className="df-text-primary mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Menos manual, mais fluxo
          </h2>
        </div>

        <ul className="mt-16 grid gap-8 lg:grid-cols-3" role="list">
          {stories.map((s) => (
            <li
              key={s.antes}
              className={cn(
                "rounded-2xl border border-border bg-card p-7 shadow-sm",
                "transition-shadow hover:shadow-md"
              )}
            >
              <div className={cn("border-l-4 pl-4", s.accent)}>
                <p className="df-text-muted text-[10px] font-bold uppercase tracking-wider">
                  Antes
                </p>
                <p className="df-text-primary mt-2 text-sm font-medium leading-relaxed">{s.antes}</p>
              </div>
              <div className="my-5 h-px bg-border" aria-hidden />
              <div className="rounded-xl bg-primary/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Depois</p>
                <p className="df-text-primary mt-2 text-sm font-semibold leading-relaxed">{s.depois}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-14 text-center">
          <Link
            href="/ferramentas"
            className="text-sm font-bold text-primary hover:underline"
          >
            Usar agora — sem cadastro complicado
          </Link>
        </p>
      </div>
    </section>
  );
}
