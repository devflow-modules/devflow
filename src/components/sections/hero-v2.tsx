"use client";

import Link from "next/link";
import {
  ArrowRight,
  MessageCircle,
  Check,
  AlertTriangle,
  Bot,
  UserRound,
  Clock,
  BarChart3,
} from "lucide-react";
import { trackFunnelCtaClick, trackHomeCta } from "@/lib/analytics";
import {
  HERO_TRUST_SIGNALS,
  PRIMARY_CONVERT_CTA_LABEL,
  PRIMARY_CONVERT_HREF,
  PRIMARY_DEMO_CTA_LABEL,
  PRIMARY_DEMO_HREF,
  PRODUCT_LIVE_HINT,
  QUICK_WHATSAPP_CTA_LABEL,
} from "@/lib/conversion-copy";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const bullets = [
  "Menos mensagem perdida — fila priorizada e SLA visível no dashboard",
  "IA no repetitivo, humano no que importa — handoff quando o cliente precisa",
  "WhatsApp Cloud API oficial, sem número espelhado — diagnóstico e operação acompanhada",
];

function OperationalDashboardMock() {
  const metrics = [
    { label: "Msg 24h", value: "1.247", color: "text-primary" },
    { label: "Bot resolve", value: "74%", color: "text-sky-600" },
    { label: "Com humano", value: "23", color: "text-orange-600" },
    { label: "TMR médio", value: "2m12s", color: "text-emerald-600" },
  ];

  const queue = [
    {
      name: "Cliente B — Pedido #1042",
      status: "SLA em risco",
      time: "8 min",
      dot: "bg-red-500",
      badge: "bg-red-500/12 text-red-600",
      icon: AlertTriangle,
    },
    {
      name: "Cliente A — Status entrega",
      status: "Resolvido pelo bot",
      time: "agora",
      dot: "bg-primary",
      badge: "bg-primary/12 text-primary",
      icon: Bot,
    },
    {
      name: "Cliente C — Reclamação",
      status: "Handoff → Ana",
      time: "2 min",
      dot: "bg-orange-400",
      badge: "bg-orange-500/12 text-orange-600",
      icon: UserRound,
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[0_8px_30px_rgba(0,0,0,0.07)] transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <BarChart3 className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="df-text-secondary truncate text-xs font-medium">Painel operacional</span>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          LIVE
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="min-w-0 rounded-lg bg-muted/50 p-2.5 text-center">
            <p className={cn("text-sm font-bold", m.color)}>{m.value}</p>
            <p className="df-text-secondary mt-0.5 text-[10px]">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="df-text-secondary mb-2 text-[10px] font-bold uppercase tracking-wide">
          Fila priorizada
        </p>
        <div className="space-y-1.5">
          {queue.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2"
            >
              <span className={cn("size-2 shrink-0 rounded-full", item.dot)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-foreground">{item.name}</p>
                <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold", item.badge)}>
                  <item.icon className="size-2.5" aria-hidden />
                  {item.status}
                </span>
              </div>
              <span className="df-text-muted flex shrink-0 items-center gap-0.5 text-[10px] font-medium">
                <Clock className="size-2.5" aria-hidden />
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HandoffChatMock() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[0_8px_30px_rgba(0,0,0,0.07)] transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <MessageCircle className="size-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Cliente C — Handoff</p>
            <p className="flex items-center gap-1 text-[10px] text-orange-600">
              <UserRound className="size-2.5" aria-hidden />
              Ana · atendente humano
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-orange-500/12 px-2 py-0.5 text-[9px] font-semibold text-orange-600">
          Handoff
        </span>
      </div>
      <div className="space-y-2">
        <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-border bg-muted/30 px-3 py-2 text-xs text-foreground">
          <span className="mb-0.5 block text-[9px] font-semibold text-primary">Bot</span>
          Entendi. Vou transferir para nossa equipe agora.
        </div>
        <div className="mx-auto w-fit rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
          ↓ Handoff para atendente
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-orange-500/20 bg-orange-500/5 px-3 py-2 text-xs text-foreground">
          <span className="mb-0.5 block text-[9px] font-semibold text-orange-600">Ana</span>
          Olá! Vi sua reclamação sobre o pedido #1042. Já estou verificando.
        </div>
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-muted px-3 py-2 text-xs text-foreground">
          Obrigado, preciso de uma solução rápida
        </div>
      </div>
    </div>
  );
}

function BotResolvedMock() {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Bot className="size-4 text-primary" aria-hidden />
        <p className="text-xs font-semibold text-primary">Conversa resolvida pelo bot</p>
      </div>
      <p className="df-text-secondary mt-2 text-[11px] leading-relaxed">
        Cliente A consultou status do pedido #1042 — resposta automática em 12s, sem escalar para humano.
      </p>
      <div className="mt-2 flex items-center gap-3 text-[10px] font-medium">
        <span className="text-primary">✓ Resolvido</span>
        <span className="df-text-muted">·</span>
        <span className="df-text-secondary">12s de resposta</span>
      </div>
    </div>
  );
}

export function HeroV2() {
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
                <span className="sm:hidden">API oficial Meta · inbox · IA</span>
                <span className="hidden sm:inline">Cloud API oficial · inbox multiatendente · IA no repetitivo</span>
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
                Transformamos seu WhatsApp em operação previsível com{" "}
                <strong className="font-semibold text-foreground">inbox multiatendente, IA no repetitivo</strong>{" "}
                e handoff humano quando importa.{" "}
                <span className="df-text-primary">
                  Diagnóstico, implementação guiada e operação acompanhada — ponta a ponta.
                </span>
              </p>
            </div>

            <ul className="grid grid-cols-1 gap-2.5 sm:gap-2.5" role="list">
              {bullets.map((bullet, i) => (
                <li
                  key={i}
                  className="df-text-primary flex items-start gap-2.5 text-sm font-medium sm:gap-3 sm:text-base sm:leading-snug"
                >
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/12">
                    <Check className="size-3.5 text-primary" aria-hidden />
                  </span>
                  <span className="min-w-0 leading-snug">{bullet}</span>
                </li>
              ))}
            </ul>

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
                    "shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)] transition-transform duration-200 ease-out",
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
                  <span className="text-balance">{PRIMARY_DEMO_CTA_LABEL}</span>
                </Link>
                <WhatsAppCta
                  label={QUICK_WHATSAPP_CTA_LABEL}
                  ariaLabel="Falar no WhatsApp com a DevFlow Labs"
                  text="Olá, vim pelo site. Quero falar sobre atendimento e vendas no WhatsApp com a DevFlow."
                  variant="secondary"
                  size="lg"
                  trackingSource="hero_whatsapp"
                  trackFunnel
                  className={cn(
                    "w-full min-h-[3rem] justify-center shadow-sm sm:w-auto sm:min-w-[min(100%,17rem)]",
                    "border-2"
                  )}
                />
              </div>
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
                <span className="text-muted-foreground"> · </span>
                <Link
                  href="/produtos/whatsapp-platform"
                  onClick={() => trackHomeCta("hero_whatsapp_platform")}
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  WhatsApp Platform
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

          {/* Mobile / tablet: composição operacional WhatsApp */}
          <div className="mx-auto w-full max-w-md space-y-3 lg:hidden">
            <OperationalDashboardMock />
            <HandoffChatMock />
            <BotResolvedMock />
          </div>

          {/* Desktop: grid operacional WhatsApp */}
          <div className="relative hidden lg:block">
            <div className="space-y-4">
              <OperationalDashboardMock />
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <HandoffChatMock />
                <BotResolvedMock />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
