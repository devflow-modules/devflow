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
            className="text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Você pode continuar no manual...
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            ...ou organizar em minutos.
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Tenha controle da operação num só lugar. Ganhe tempo todo dia.
          </p>

          <p className="mt-2 text-xs font-medium text-emerald-400/90">
            Já em uso hoje em operações reais.
          </p>

          <div className="mt-6 flex flex-col items-stretch gap-3 sm:mt-8 sm:items-center sm:gap-4">
            <Link
              href={PRIMARY_DEMO_HREF}
              aria-label="Ver demonstração guiada de atendimento no WhatsApp"
              className={cn(
                "devflow-cta-elite inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl px-4 text-left text-sm font-bold leading-snug sm:min-h-14 sm:min-w-[min(100%,300px)] sm:justify-center sm:px-8 sm:text-base md:text-lg",
                "bg-primary text-primary-foreground",
                "transition-transform duration-200 hover:scale-[1.02] hover:bg-[#16a34a] active:scale-[0.98] sm:hover:scale-[1.03]"
              )}
            >
              <span className="text-balance">{PRIMARY_CONVERT_CTA_LABEL}</span>
              <ArrowRight className="size-5 shrink-0" aria-hidden />
            </Link>
            <WhatsAppCta
              label={SPECIALIST_WHATSAPP_CTA_LABEL}
              ariaLabel="Falar com especialista no WhatsApp"
              size="default"
              text="Quero ver como organizar meu WhatsApp com a DevFlow — falar com especialista."
              className="!min-h-12 !border-white/20 !bg-transparent !px-4 !text-white hover:!bg-white/10"
            />
          </div>
          <p className="mt-6 text-xs text-slate-500">
            Ferramentas grátis · Sem cartão · Cancele quando quiser
          </p>
        </div>
      </div>
    </section>
  );
}
