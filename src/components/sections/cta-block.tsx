"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

type CtaBlockProps = {
  title: string;
  subtitle?: string;
  primaryLabel: string;
  primaryHref: string;
  /** Se definido, substitui o WhatsApp por um link secundário (ex.: /ferramentas no hub de produtos). */
  secondaryLink?: { label: string; href: string };
  whatsappText?: string;
};

export function CtaBlock({
  title,
  subtitle = "Tudo no mesmo ecossistema DevFlow Labs.",
  primaryLabel,
  primaryHref,
  secondaryLink,
  whatsappText = "Olá, quero entender como a DevFlow Labs pode me ajudar.",
}: CtaBlockProps) {
  return (
    <section
      className="df-page df-brand-gradient relative overflow-hidden py-24"
      aria-labelledby="cta-block-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 df-gradient-text-scrim" />
        <div className="df-decor-radial-brand-soft absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-20" />
        <div className="df-decor-grid-mesh absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="df-surface-elevated mx-auto max-w-2xl rounded-2xl border border-border p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-[var(--devflow-brand)]" aria-hidden />
          <h2
            id="cta-block-heading"
            className="df-text-primary text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {title}
          </h2>
          {subtitle && <p className="df-text-secondary mt-4 leading-relaxed">{subtitle}</p>}

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={primaryHref}
              className={cn(
                "df-btn-primary df-shadow-cta inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold"
              )}
            >
              {primaryLabel}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            {secondaryLink ? (
              <Link
                href={secondaryLink.href}
                className="df-btn-secondary inline-flex h-12 min-w-[10rem] items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold transition-colors"
              >
                {secondaryLink.label}
              </Link>
            ) : (
              <WhatsAppCta
                label="Falar com a gente"
                size="default"
                text={whatsappText}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
