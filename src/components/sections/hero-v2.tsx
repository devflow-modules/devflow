"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { trackCtaWhatsAppClick, trackFunnelCtaClick, trackHomeCta } from "@/lib/analytics";
import {
  HERO_TRUST_SIGNALS,
  HOME_DEMO_CTA_LABEL,
  PRIMARY_CONVERT_CTA_LABEL,
  PRIMARY_CONVERT_HREF,
  PRIMARY_DEMO_HREF,
  PRODUCT_LIVE_HINT,
  QUICK_WHATSAPP_CTA_LABEL,
} from "@/lib/conversion-copy";
import { getWhatsAppOrMailtoUrl, isWhatsAppNumberConfigured } from "@/lib/whatsapp";
import { ProductInboxShowcase } from "@/components/sections/product-inbox-showcase";

const HERO_WHATSAPP_TEXT =
  "Olá, vim pelo site. Quero falar sobre atendimento e vendas no WhatsApp com a DevFlow.";

export function HeroV2() {
  const whatsAppHref = getWhatsAppOrMailtoUrl(HERO_WHATSAPP_TEXT);
  const whatsAppOpensChat = isWhatsAppNumberConfigured();

  return (
    <section id="hero" className="df-v2-section pb-12 lg:pb-20" aria-labelledby="hero-heading">
      <div className="df-v2-container grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-6">
          <p className="text-[13px] font-semibold tracking-[0.04em] text-[var(--df-v2-brand)]">
            Operação de atendimento no WhatsApp
          </p>
          <h1 id="hero-heading" className="df-v2-h1 mt-4 max-w-[14ch] text-balance">
            Organize cada conversa. Saiba quem está cuidando dela.
          </h1>
          <p className="df-v2-lead mt-5 max-w-[38rem]">
            A equipe deixa de atender espalhada no celular. A DevFlow coloca dono, fila e contexto na mesma
            operação, com a API oficial da Meta, sem trocar os sistemas que vocês já usam.
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Link
              href={PRIMARY_CONVERT_HREF}
              onClick={() => {
                trackHomeCta("hero_agendar_diagnostico");
                trackFunnelCtaClick({ cta: "agendar_diagnostico", surface: "hero_primary" });
              }}
              aria-label="Agendar diagnóstico da operação no WhatsApp"
              className="df-btn-primary min-h-12 px-5 text-sm font-semibold sm:min-w-52"
            >
              {PRIMARY_CONVERT_CTA_LABEL}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href={PRIMARY_DEMO_HREF}
              onClick={() => {
                trackHomeCta("hero_ver_demo");
                trackFunnelCtaClick({ cta: "ver_demo_guiada", surface: "hero_secondary" });
              }}
              aria-label="Ver demonstração guiada de atendimento no WhatsApp"
              className="df-btn-secondary min-h-12 px-5 text-sm font-semibold"
            >
              {HOME_DEMO_CTA_LABEL}
            </Link>
          </div>
          <p className="mt-4">
            <a
              href={whatsAppHref}
              target={whatsAppOpensChat ? "_blank" : undefined}
              rel={whatsAppOpensChat ? "noopener noreferrer" : undefined}
              aria-label={
                whatsAppOpensChat
                  ? "Falar no WhatsApp com a DevFlow Labs"
                  : "Falar no WhatsApp: abrir cliente de e-mail"
              }
              onClick={() => {
                trackCtaWhatsAppClick("hero_whatsapp");
                trackHomeCta("hero_whatsapp");
                trackFunnelCtaClick({ cta: "falar_whatsapp", surface: "hero_whatsapp" });
              }}
              className="text-sm font-medium text-[var(--df-v2-brand)] underline-offset-4 hover:underline"
            >
              {QUICK_WHATSAPP_CTA_LABEL}
            </a>
          </p>
          <p className="mt-3 text-sm text-[var(--df-v2-muted)]">{PRODUCT_LIVE_HINT}</p>
          <ul className="mt-6 flex flex-col gap-2 text-sm text-[var(--df-v2-ink-soft)] sm:flex-row sm:flex-wrap sm:gap-x-4" role="list">
            {HERO_TRUST_SIGNALS.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-6 lg:pl-4">
          <ProductInboxShowcase />
        </div>
      </div>
    </section>
  );
}
