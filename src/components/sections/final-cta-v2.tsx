"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { trackFunnelCtaClick } from "@/lib/analytics";
import {
  PRIMARY_CONVERT_CTA_LABEL,
  PRIMARY_CONVERT_HREF,
  PRIMARY_DEMO_CTA_LABEL,
  PRIMARY_DEMO_HREF,
} from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

export function FinalCtaV2() {
  return (
    <section
      id="cta-final"
      className="relative overflow-x-clip overflow-y-visible bg-[var(--devflow-background)] py-10 sm:py-14 lg:py-18"
      aria-labelledby="final-cta-v2-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="df-decor-radial-brand absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-30" />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "mx-auto max-w-xl df-surface-elevated rounded-2xl p-6 text-center backdrop-blur-sm sm:p-10 lg:p-12"
          )}
        >
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="final-cta-v2-heading"
            className="df-text-primary text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Menos mensagem perdida. Mais venda preservada.
          </h2>
          <p className="df-text-secondary mt-4 text-base leading-relaxed sm:text-lg">
            Agende um diagnóstico para transformar atendimento e vendas no WhatsApp em rotina previsível.
          </p>
          <p className="df-text-secondary mt-3 text-sm leading-relaxed">
            IA no repetitivo, humano no que importa — com WhatsApp Cloud API oficial, fila, handoff e dashboard.
          </p>

          <p className="mt-2 text-xs font-medium df-status-brand">
            Operações reais em produção · implementação consultiva ponta a ponta
          </p>

          <div className="mt-6 flex flex-col items-stretch gap-3 sm:mt-8 sm:items-center sm:gap-4">
            <Link
              href={PRIMARY_CONVERT_HREF}
              aria-label="Agendar diagnóstico da operação no WhatsApp"
              onClick={() =>
                trackFunnelCtaClick({ cta: "agendar_diagnostico", surface: "final_cta_primary" })
              }
              className={cn(
                "df-btn-primary devflow-cta-elite inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold sm:min-h-14 sm:min-w-[min(100%,300px)] sm:text-base",
                "df-shadow-cta transition-transform duration-200",
                "hover:scale-[1.02] active:scale-[0.98] sm:hover:scale-[1.03]"
              )}
            >
              {PRIMARY_CONVERT_CTA_LABEL}
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
            <Link
              href={PRIMARY_DEMO_HREF}
              aria-label="Ver demonstração guiada de atendimento no WhatsApp"
              onClick={() =>
                trackFunnelCtaClick({ cta: "ver_demo_guiada", surface: "final_cta_secondary" })
              }
              className="df-btn-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold transition-colors"
            >
              {PRIMARY_DEMO_CTA_LABEL}
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
