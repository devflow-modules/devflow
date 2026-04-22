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
      className="relative overflow-hidden bg-[#f1f5f9] py-24"
      aria-labelledby="cta-block-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div
          className="absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)" }}
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
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="cta-block-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            {title}
          </h2>
          {subtitle && <p className="mt-4 text-slate-600">{subtitle}</p>}

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={primaryHref}
              className={cn(
                "inline-flex items-center justify-center gap-2 h-12 rounded-xl px-6 text-base font-semibold",
                "bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90"
              )}
            >
              {primaryLabel}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            {secondaryLink ? (
              <Link
                href={secondaryLink.href}
                className={cn(
                  "inline-flex h-12 min-w-[10rem] items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 text-base font-semibold text-foreground transition-colors hover:bg-muted/60"
                )}
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
