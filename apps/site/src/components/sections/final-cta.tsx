"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { trackCtaDemoClick } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function FinalCta() {
  return (
    <section
      id="cta-final"
      className="df-section-light relative overflow-hidden bg-muted/40 py-24"
      aria-labelledby="final-cta-heading"
    >
      {/* Assinatura visual — grid + glow sutil */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="df-decor-radial-brand-soft absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-20" />
        <div className="df-decor-radial-accent absolute -bottom-20 -left-20 h-60 w-60 rounded-full opacity-15" />
        <div className="df-decor-grid-mesh absolute inset-0 opacity-[0.03]" />
      </div>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "mx-auto max-w-2xl rounded-xl border border-border bg-card p-8 text-center shadow-sm sm:p-12",
            "transition-all duration-200 hover:shadow-lg"
          )}
        >
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="final-cta-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Veja a DevFlow funcionando
          </h2>
          <p className="mt-4 df-text-secondary">
            Teste a automação de atendimento. Converse pelo WhatsApp ou veja a demonstração.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-4">
            <WhatsAppCta
              label="Quero automatizar meu atendimento"
              size="lg"
              text="Olá, quero entender como funciona a automação da DevFlow."
            />
            <Link
              href="/demo"
              onClick={() => trackCtaDemoClick("final_cta")}
              className={cn(
                "inline-flex items-center justify-center gap-2 h-12 rounded-lg border border-[#e2e8f0] px-5 text-base font-semibold",
                "bg-card text-foreground transition-all duration-200 hover:bg-[#f1f5f9]"
              )}
            >
              Ver uma conversa em ação
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
