"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

export function FinalCtaV2() {
  return (
    <section
      id="cta-final"
      className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 py-24 text-white"
      aria-labelledby="final-cta-v2-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div
          className="absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.35) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%)" }}
        />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm sm:p-12",
            "shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
          )}
        >
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="final-cta-v2-heading"
            className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl"
          >
            Você pode continuar fazendo manualmente...
          </h2>
          <p className="mt-4 text-lg font-medium text-slate-300 sm:text-xl">
            ...ou resolver isso agora em minutos.
          </p>
          <p className="mt-3 text-sm text-amber-200/90">
            Cada dia sem automatizar é tempo perdido. Cada cliente não respondido é uma venda perdida.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/ferramentas"
              className={cn(
                "inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-xl px-7 text-base font-bold",
                "bg-primary text-primary-foreground shadow-[0_4px_20px_rgba(34,197,94,0.45)]",
                "transition-all hover:bg-[#16a34a] hover:shadow-lg"
              )}
            >
              Começar agora
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <WhatsAppCta
              label="Falar no WhatsApp"
              size="default"
              text="Olá, quero entender como a DevFlow Labs pode me ajudar."
            />
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            Sem cartão nas ferramentas grátis · Sem compromisso · Você pode parar quando quiser
          </p>
        </div>
      </div>
    </section>
  );
}
