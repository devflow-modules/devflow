"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { trackFunnelCtaClick } from "@/lib/analytics";
import {
  HOME_DEMO_CTA_LABEL,
  PRIMARY_CONVERT_CTA_LABEL,
  PRIMARY_CONVERT_HREF,
  PRIMARY_DEMO_HREF,
} from "@/lib/conversion-copy";

export function FinalCtaV2() {
  return (
    <section id="cta-final" className="df-v2-dark df-v2-section" aria-labelledby="final-cta-v2-heading">
      <div className="df-v2-container max-w-3xl">
        <h2 id="final-cta-v2-heading" className="df-v2-h2 text-balance">
          Quer entender como essa operação funcionaria na sua empresa?
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--df-v2-on-dark-muted)]">
          Em uma conversa rápida, analisamos como sua equipe usa o WhatsApp hoje e mostramos onde a DevFlow pode
          organizar atendimento, distribuição e acompanhamento.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={PRIMARY_CONVERT_HREF}
            aria-label="Agendar diagnóstico da operação no WhatsApp"
            onClick={() =>
              trackFunnelCtaClick({ cta: "agendar_diagnostico", surface: "final_cta_primary" })
            }
            className="df-btn-primary min-h-12 px-5 text-sm font-semibold"
          >
            {PRIMARY_CONVERT_CTA_LABEL}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href={PRIMARY_DEMO_HREF}
            aria-label="Ver demonstração guiada de atendimento no WhatsApp"
            onClick={() =>
              trackFunnelCtaClick({ cta: "ver_demo_guiada", surface: "final_cta_secondary" })
            }
            className="df-btn-secondary min-h-12 px-5 text-sm font-semibold"
          >
            {HOME_DEMO_CTA_LABEL}
          </Link>
        </div>
        <p className="mt-6 text-sm text-[var(--df-v2-on-dark-muted)]">
          O próximo passo é o diagnóstico da operação no WhatsApp.
        </p>
      </div>
    </section>
  );
}
