import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToolsHubHero() {
  return (
    <section
      id="ferramentas-hero"
      className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 py-20"
      aria-labelledby="tools-hub-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div
          className="absolute -top-40 -right-40 h-80 w-80 rounded-full opacity-30"
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

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary mb-6">
            <Wrench className="size-3.5" aria-hidden />
            Hub de ferramentas
          </div>

          <h1
            id="tools-hub-heading"
            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          >
            Tudo que você precisa num só hub — grátis pra começar
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Menos planilha, menos app solto. Abre o browser e resolve.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/ferramentas/financeiro"
              className={cn(
                "inline-flex items-center justify-center gap-2 h-12 rounded-xl px-6 text-base font-bold",
                "bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90"
              )}
            >
              Testar grátis
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/produtos"
              className={cn(
                "inline-flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-border px-6 text-base font-bold",
                "bg-white text-foreground transition-all duration-200 hover:bg-slate-50"
              )}
            >
              Começar agora
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Sem instalação · Leva menos de 1 minuto
          </p>
        </div>
      </div>
    </section>
  );
}
