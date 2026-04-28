import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToolsHubHero() {
  return (
    <section
      id="ferramentas-hero"
      className="df-page df-brand-gradient relative overflow-x-clip py-12 sm:py-16 lg:py-20"
      aria-labelledby="tools-hub-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div
          className="absolute -top-40 -right-40 h-80 w-80 max-w-[100vw] rounded-full opacity-25 sm:opacity-30"
          style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.6) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="mx-auto max-w-[1200px] px-3 min-[400px]:px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary sm:mb-6 sm:px-3 sm:text-xs">
            <Wrench className="size-3.5 shrink-0" aria-hidden />
            Hub de ferramentas
          </div>

          <h1
            id="tools-hub-heading"
            className="text-balance text-2xl font-bold tracking-tight text-foreground min-[400px]:text-[1.65rem] sm:text-4xl lg:text-5xl"
          >
            Tudo que você precisa num só hub — grátis pra começar
          </h1>
          <p className="df-text-muted mt-3 text-base leading-relaxed sm:mt-4 sm:text-lg">
            Menos planilha, menos app solto. Abre o browser e resolve.
          </p>

          <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
            <Link
              href="/demo"
              className={cn(
                "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold sm:w-auto sm:px-6 sm:text-base",
                "bg-primary text-primary-foreground transition-all duration-200 hover:bg-[#00A86B]"
              )}
            >
              Ver demo
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
            <Link
              href="/ferramentas/financeiro"
              className={cn(
                "df-surface inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-5 text-sm font-medium sm:w-auto sm:px-6 sm:text-base",
                "text-foreground transition-colors hover:bg-primary/10"
              )}
            >
              Abrir ferramenta Financeiro
            </Link>
          </div>
          <p className="df-text-muted mt-3 text-xs sm:mt-4 sm:text-sm">
            Ferramentas gratuitas · Sem instalação
          </p>
        </div>
      </div>
    </section>
  );
}
