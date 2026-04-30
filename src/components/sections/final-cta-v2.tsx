"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  PRIMARY_CONVERT_CTA_LABEL,
  PRIMARY_DEMO_CTA_LABEL,
  PRIMARY_DEMO_HREF,
} from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

export function FinalCtaV2() {
  return (
    <section
      id="cta-final"
      className="relative overflow-x-clip overflow-y-visible bg-gradient-to-b from-card to-muted py-10 text-foreground sm:py-14 lg:py-18"
      aria-labelledby="final-cta-v2-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="df-decor-radial-brand absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-30" />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "mx-auto max-w-xl rounded-2xl border border-white/10 bg-card/5 p-6 text-center backdrop-blur-sm sm:p-10 lg:p-12"
          )}
        >
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="final-cta-v2-heading"
            className="df-text-primary text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Sua operação no WhatsApp precisa de método
          </h2>
          <p className="df-text-secondary mt-4 text-base leading-relaxed sm:text-lg">
            Diagnóstico inicial para transformar atendimento e vendas em rotina previsível.
          </p>
          <p className="df-text-secondary mt-3 text-sm leading-relaxed">
            Implementação guiada, IA no repetitivo e gestão com SLA no dashboard operacional.
          </p>

          <p className="mt-2 text-xs font-medium text-emerald-400">
            Já em uso hoje em operações reais.
          </p>

          <div className="mt-6 flex flex-col items-stretch gap-3 sm:mt-8 sm:items-center sm:gap-4">
            <Link
              href={PRIMARY_DEMO_HREF}
              aria-label="Ver demonstração guiada de atendimento no WhatsApp"
              className={cn(
                "devflow-cta-elite inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-primary-foreground sm:min-h-14 sm:min-w-[min(100%,300px)] sm:text-base",
                "bg-primary shadow-[0_14px_40px_-6px_rgba(34,197,94,0.45)] transition-transform duration-200",
                "hover:scale-[1.02] hover:brightness-[1.08] active:scale-[0.98] sm:hover:scale-[1.03]"
              )}
            >
              {PRIMARY_DEMO_CTA_LABEL}
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
            <Link
              href="/contato"
              aria-label="Agendar diagnóstico — ir para contato"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-transparent px-6 text-sm font-semibold text-white transition-colors hover:bg-card/10"
            >
              {PRIMARY_CONVERT_CTA_LABEL}
            </Link>
          </div>
          <p className="df-text-muted mt-6 text-xs leading-relaxed">
            Oferta principal: implementação de operação de atendimento e vendas no WhatsApp
          </p>
        </div>
      </div>
    </section>
  );
}
