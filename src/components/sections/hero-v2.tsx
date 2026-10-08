"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, BarChart3, Bot, UserRound } from "lucide-react";
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
import { cn } from "@/lib/utils";

const HERO_WHATSAPP_TEXT =
  "Olá, vim pelo site. Quero falar sobre atendimento e vendas no WhatsApp com a DevFlow.";

const illustrativeQueue = [
  { label: "Fila", status: "Aguardando responsável", icon: UserRound },
  { label: "Automação", status: "Dúvida frequente", icon: Bot },
  { label: "Handoff", status: "Com a equipe", icon: MessageCircle },
];

function IllustrativeQueue() {
  return (
    <div className="df-surface-elevated rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <BarChart3 className="size-4 shrink-0 df-status-brand" aria-hidden />
          <span className="df-text-secondary truncate text-xs font-medium">Demonstração da plataforma</span>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold df-text-secondary">
          Dados ilustrativos
        </span>
      </div>
      <p className="df-text-muted mb-3 text-[11px] leading-relaxed">
        Estrutura da fila. Não representa uma operação de cliente.
      </p>
      <div className="space-y-1.5">
        {illustrativeQueue.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2"
          >
            <item.icon className="size-3.5 shrink-0 df-status-brand" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold df-text-primary">{item.label}</p>
              <p className="df-text-secondary truncate text-[10px]">{item.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroV2() {
  const whatsAppHref = getWhatsAppOrMailtoUrl(HERO_WHATSAPP_TEXT);
  const whatsAppOpensChat = isWhatsAppNumberConfigured();

  return (
    <section
      id="hero"
      className="df-page df-brand-gradient relative overflow-x-clip overflow-y-visible py-10 sm:py-16 lg:py-24"
      aria-labelledby="hero-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 df-gradient-text-scrim" />
        <div className="df-decor-radial-brand absolute -top-40 -right-40 h-96 w-96 rounded-full opacity-40 max-lg:opacity-25" />
        <div className="df-decor-radial-accent absolute -bottom-32 -left-32 h-80 w-80 rounded-full opacity-30 max-lg:opacity-20" />
        <div className="df-decor-grid-mesh absolute inset-0 opacity-[0.035]" />
      </div>

      <div className="mx-auto max-w-[1200px] px-3 min-[400px]:px-4 sm:px-6 lg:px-8">
        <div className="grid min-w-0 gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-16 lg:items-center">
          <div className="min-w-0 space-y-4 sm:space-y-6 lg:space-y-7">
            <div className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-primary/35 bg-primary/8 px-2.5 py-1.5 text-[11px] font-semibold shadow-sm min-[380px]:gap-2 min-[380px]:px-3 min-[380px]:text-xs sm:text-xs">
              <span className="size-2 shrink-0 rounded-full bg-primary ring-2 ring-primary/30" aria-hidden />
              <MessageCircle className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span className="text-primary">WhatsApp Platform</span>
              <span className="df-text-secondary hidden sm:inline">·</span>
              <span className="df-text-secondary w-full sm:w-auto sm:truncate">
                Cloud API oficial · inbox da equipe
              </span>
            </div>

            <div className="max-w-[600px] space-y-3 sm:space-y-4">
              <h1
                id="hero-heading"
                className="df-text-primary text-balance text-[1.5rem] font-extrabold leading-[1.2] tracking-tight min-[360px]:text-[1.625rem] min-[400px]:text-[1.75rem] sm:text-4xl sm:leading-[1.12] lg:text-[3.15rem]"
              >
                Menos mensagem perdida. Mais resposta no tempo certo. Mais venda preservada.
              </h1>
              <p className="df-text-secondary text-base leading-relaxed sm:text-lg lg:text-xl">
                O WhatsApp da equipe deixa de ficar espalhado no celular. A DevFlow organiza o fluxo e passa a
                conversa para uma pessoa quando ela precisa de contexto.
              </p>
            </div>

            <div className="space-y-3 pt-0.5 sm:pt-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-4">
                <Link
                  href={PRIMARY_CONVERT_HREF}
                  onClick={() => {
                    trackHomeCta("hero_agendar_diagnostico");
                    trackFunnelCtaClick({ cta: "agendar_diagnostico", surface: "hero_primary" });
                  }}
                  aria-label="Agendar diagnóstico da operação no WhatsApp"
                  className={cn(
                    "df-btn-primary devflow-cta-elite inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold leading-snug sm:min-h-14 sm:w-auto sm:min-w-[min(100%,280px)] sm:px-6 sm:text-base md:px-8 md:text-lg",
                    "df-shadow-cta transition-transform duration-200 ease-out",
                    "hover:scale-[1.02] active:scale-[0.98] sm:hover:scale-[1.03]"
                  )}
                >
                  <span className="text-balance">{PRIMARY_CONVERT_CTA_LABEL}</span>
                  <ArrowRight className="size-5 shrink-0" aria-hidden />
                </Link>
                <Link
                  href={PRIMARY_DEMO_HREF}
                  onClick={() => {
                    trackHomeCta("hero_ver_demo");
                    trackFunnelCtaClick({ cta: "ver_demo_guiada", surface: "hero_secondary" });
                  }}
                  aria-label="Ver demonstração guiada de atendimento no WhatsApp"
                  className={cn(
                    "inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-4 text-sm font-bold leading-snug text-foreground sm:min-h-14 sm:w-auto sm:min-w-[min(100%,17rem)] sm:px-6 sm:text-base",
                    "shadow-sm transition-transform duration-200 ease-out hover:border-primary/35 hover:bg-muted/30"
                  )}
                >
                  <span className="text-balance">{HOME_DEMO_CTA_LABEL}</span>
                </Link>
              </div>
              <p className="text-center sm:text-left">
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
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  {QUICK_WHATSAPP_CTA_LABEL}
                </a>
              </p>
              <p className="df-text-secondary text-center text-[11px] font-medium leading-snug sm:text-left sm:text-xs">
                {PRODUCT_LIVE_HINT}
              </p>
              <p className="df-text-secondary text-center text-xs leading-snug sm:text-left sm:text-sm">
                <Link
                  href="/#como-funciona-hub"
                  onClick={() => trackHomeCta("hero_how_it_works")}
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Como funciona
                </Link>
              </p>
            </div>

            <ul
              className="df-text-secondary flex flex-col gap-2 border-t border-border pt-4 text-[11px] font-medium sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1 sm:pt-5 sm:text-sm"
              role="list"
              aria-label="Sinais de confiança"
            >
              {HERO_TRUST_SIGNALS.map((signal, i) => (
                <li key={signal} className="inline-flex items-center gap-1.5">
                  {i > 0 && <span className="hidden text-muted-foreground sm:inline" aria-hidden>·</span>}
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {signal}
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <IllustrativeQueue />
          </div>
        </div>
      </div>
    </section>
  );
}
