"use client";

import Link from "next/link";
import { Wallet, MessageCircle, ArrowRight, Layers } from "lucide-react";
import { trackCrossSell } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Na landing do financeiro: WhatsApp + hub de produtos (evita repetir o card financeiro). */
  variant?: "default" | "financeiro-page";
};

export function CrossSellBeyond({ className, variant = "default" }: Props) {
  const isFinanceiroPage = variant === "financeiro-page";

  return (
    <section
      className={cn(
        "df-section-light rounded-2xl border-2 border-dashed border-primary/25 bg-gradient-to-br from-primary/[0.06] to-slate-100 p-5 sm:p-8 lg:p-10",
        className
      )}
      aria-labelledby="cross-sell-heading"
    >
      <h2 id="cross-sell-heading" className="df-text-primary text-center text-xl font-bold sm:text-2xl">
        Quer ir além?
      </h2>
      <p className="df-text-secondary mx-auto mt-2 max-w-lg text-center text-sm">
        Essas ferramentas resolvem mais ainda da sua operação.
      </p>

      <div className="mt-6 grid auto-rows-fr gap-4 sm:mt-8 sm:grid-cols-2">
        {!isFinanceiroPage && (
        <Link
          href="/ferramentas/financeiro"
          onClick={() => trackCrossSell("financeiro")}
          className={cn(
            "group df-card-light flex h-full min-h-0 flex-col rounded-2xl border p-5 text-left sm:p-6",
            "shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg"
          )}
        >
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/12">
            <Wallet className="size-6 text-primary" aria-hidden />
          </div>
          <h3 className="mt-4 font-bold text-foreground group-hover:text-primary">
            Sistema financeiro
          </h3>
          <p className="df-text-secondary mt-1 text-sm">
            PF, PJ e casal: orçamentos, recorrências, fechamento mensal e importação CSV.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">
            Testar grátis
            <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" aria-hidden />
          </span>
        </Link>
        )}

        <Link
          href="/automacao-whatsapp"
          onClick={() => trackCrossSell("whatsapp")}
          className={cn(
            "group df-card-light flex h-full min-h-0 flex-col rounded-2xl border p-5 text-left sm:p-6",
            "shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/35 hover:shadow-lg"
          )}
        >
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/12">
            <MessageCircle className="size-6 text-emerald-600" aria-hidden />
          </div>
          <h3 className="df-text-primary mt-4 font-bold group-hover:text-emerald-700">
            Automação WhatsApp
          </h3>
          <p className="df-text-secondary mt-1 text-sm">
            Respostas automáticas, handoff para humano e métricas — não perca mais venda por demora.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
            Começar agora
            <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" aria-hidden />
          </span>
        </Link>

        {isFinanceiroPage && (
          <Link
            href="/produtos"
            onClick={() => trackCrossSell("produtos")}
            className={cn(
              "group df-card-light flex h-full min-h-0 flex-col rounded-2xl border p-5 text-left sm:p-6",
              "shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg"
            )}
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-slate-200">
              <Layers className="df-text-primary size-6" aria-hidden />
            </div>
            <h3 className="df-text-primary mt-4 font-bold group-hover:text-primary">
              Produtos SaaS
            </h3>
            <p className="df-text-secondary mt-1 text-sm">
              WhatsApp Platform, financeiro completo e roadmap — tudo no mesmo hub.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">
              Começar agora
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
