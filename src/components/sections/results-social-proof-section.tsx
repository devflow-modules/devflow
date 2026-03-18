import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const stories = [
  {
    antes: "Demorava horas pra organizar tudo",
    depois: "Agora faço tudo em minutos",
    accent: "border-l-primary",
  },
  {
    antes: "Demorava horas pra responder clientes",
    depois: "Agora tudo é automático",
    accent: "border-l-emerald-500",
  },
  {
    antes: "Perdia a tarde na planilha",
    depois: "Abro o painel e sei onde estou",
    accent: "border-l-blue-500",
  },
];

export function ResultsSocialProofSection() {
  return (
    <section
      id="resultados-reais"
      className="bg-white py-20 sm:py-24"
      aria-labelledby="results-social-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <TrendingUp className="size-3.5" aria-hidden />
            Prova real (antes → depois)
          </div>
          <h2
            id="results-social-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Quem usa, não volta atrás
          </h2>
          <p className="mt-3 text-slate-600">
            Histórias de quem trocou o manual por fluxo — menos estresse, mais resultado.
          </p>
        </div>

        <ul className="mt-14 grid gap-6 lg:grid-cols-3" role="list">
          {stories.map((s) => (
            <li
              key={s.antes}
              className={cn(
                "rounded-2xl border border-border bg-card p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
                "transition-shadow duration-300 hover:shadow-[0_16px_48px_rgba(0,0,0,0.09)]"
              )}
            >
              <div className={cn("border-l-4 pl-4", s.accent)}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Antes
                </p>
                <p className="mt-1 text-sm font-medium leading-snug text-slate-700">{s.antes}</p>
              </div>
              <div className="my-4 h-px bg-border" aria-hidden />
              <div className="rounded-xl bg-primary/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Depois</p>
                <p className="mt-1 text-sm font-semibold leading-snug text-foreground">{s.depois}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center">
          <Link
            href="/ferramentas"
            className="inline-flex text-sm font-bold text-primary hover:underline"
          >
            Usar agora — é grátis
          </Link>
        </p>
      </div>
    </section>
  );
}
