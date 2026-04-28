"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import {
  PRIMARY_CONVERT_CTA_LABEL,
  PRIMARY_DEMO_HREF,
  SPECIALIST_WHATSAPP_CTA_LABEL,
} from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

export function FinalCtaV2() {
  return (
    <section
      id="cta-final"
      className="relative overflow-x-clip overflow-y-visible bg-gradient-to-b from-slate-900 to-slate-950 py-10 text-white sm:py-14 lg:py-18"
      aria-labelledby="final-cta-v2-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div
          className="absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.35) 0%, transparent 70%)" }}
        />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm sm:p-10 lg:p-12"
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
            <WhatsAppCta
              label={PRIMARY_CONVERT_CTA_LABEL}
              ariaLabel="Agendar diagnóstico da operação no WhatsApp"
              size="default"
              text="Quero agendar um diagnóstico da minha operação de atendimento e vendas no WhatsApp."
              className={cn(
                "devflow-cta-elite inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl px-4 text-left text-sm font-bold leading-snug sm:min-h-14 sm:min-w-[min(100%,300px)] sm:justify-center sm:px-8 sm:text-base md:text-lg",
                "bg-primary text-primary-foreground",
                "transition-transform duration-200 hover:scale-[1.02] hover:bg-[#16a34a] active:scale-[0.98] sm:hover:scale-[1.03]"
              )}
            />
            <Link
              href={PRIMARY_DEMO_HREF}
              aria-label="Ver demonstração guiada de atendimento no WhatsApp"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-transparent px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Ver demo em 2 minutos
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
            <WhatsAppCta
              label={SPECIALIST_WHATSAPP_CTA_LABEL}
              ariaLabel="Falar com especialista no WhatsApp"
              size="default"
              text="Quero entender a implementação da operação de WhatsApp com a DevFlow."
              className="!min-h-12 !border-white/20 !bg-transparent !px-4 !text-white hover:!bg-white/10"
            />
          </div>
          <p className="df-text-muted mt-6 text-xs leading-relaxed">
            Oferta principal: implementação de operação de atendimento e vendas no WhatsApp
          </p>
        </div>
      </div>
    </section>
  );
}
