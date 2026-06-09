import { ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { VER_EXEMPLO_REAL_CTA_LABEL } from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

const stories = [
  {
    antes: "Demorava horas pra organizar tudo",
    depois: "Agora faço em minutos",
    accent: "border-l-[var(--devflow-brand)]",
  },
  {
    antes: "Cliente esperando resposta",
    depois: "Automático 24h",
    accent: "border-l-[var(--devflow-success)]",
  },
  {
    antes: "Planilha espalhada",
    depois: "Um painel, visão clara",
    accent: "border-l-[var(--devflow-info)]",
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
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border df-bg-brand-soft px-3 py-1 text-xs font-semibold df-status-brand">
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
                "df-surface rounded-2xl p-7 shadow-sm",
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
              <div className="rounded-xl df-bg-brand-soft px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider df-status-brand">Depois</p>
                <p className="df-text-primary mt-2 text-sm font-semibold leading-relaxed">{s.depois}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-14 flex justify-center">
          <Link
            href="/projetos"
            className={cn(
              "df-btn-primary inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold",
              "df-shadow-cta"
            )}
          >
            {VER_EXEMPLO_REAL_CTA_LABEL}
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        </p>
      </div>
    </section>
  );
}
