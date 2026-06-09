import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  MessageCircleMore,
  Radio,
  Users2,
} from "lucide-react";
import { ProductPageBackLink } from "@/components/products/product-page-back-link";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { PRIMARY_DEMO_CTA_LABEL } from "@/lib/conversion-copy";
import { whatsappAppUrl } from "@/lib/whatsapp-app-url";
import { cn } from "@/lib/utils";

const heroPoints = [
  "Diagnóstico da operação atual para priorizar gargalos de atendimento e vendas",
  "Implementação guiada da IA no repetitivo com handoff para o time certo",
  "Gestão diária com SLA, fila priorizada e dashboard operacional",
];

const queueItems = [
  {
    name: "ACME · Upgrade anual",
    status: "Score 94 · respondendo agora · SLA 6m restantes",
    dot: "df-dot-success",
    tag: "Vendas",
  },
  {
    name: "Clínica Horizonte",
    status: "Automação disparada há 9s · doc no ar",
    dot: "df-dot-info",
    tag: "Suporte",
  },
  {
    name: "Studio North",
    status: "Handoff p/ Carla · deal quente preservado",
    dot: "df-dot-warning",
    tag: "Prioridade",
  },
];

export function HeroSection() {
  return (
    <section
      aria-labelledby="whatsapp-hero-heading"
      className="df-page df-brand-gradient relative overflow-hidden border-b df-border-brand py-16 sm:py-20 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 df-gradient-text-scrim" />
        <div className="df-decor-radial-brand absolute -top-32 -right-24 h-80 w-80 rounded-full opacity-45" />
        <div className="df-decor-radial-accent absolute -bottom-24 -left-20 h-72 w-72 rounded-full opacity-30" />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <ProductPageBackLink className="mb-6 sm:mb-8" />

        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="space-y-7">
            <span className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border df-border-brand bg-card/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide shadow-sm backdrop-blur-sm sm:text-xs">
              <Radio className="size-3.5 shrink-0 df-status-brand" aria-hidden />
              <span className="df-status-brand">Fila ativa</span>
              <span className="df-text-muted hidden sm:inline" aria-hidden>
                ·
              </span>
              <span className="df-text-secondary w-full pl-5 sm:w-auto sm:pl-0">API oficial · inbox · IA · score · SLA</span>
            </span>

            <div className="space-y-5">
              <h1
                id="whatsapp-hero-heading"
                className="df-text-primary text-balance text-[1.65rem] font-bold leading-[1.15] tracking-tight sm:text-4xl sm:leading-[1.12] lg:text-[2.65rem] lg:leading-[1.08]"
              >
                Implementamos sua operação de WhatsApp para responder rápido e vender com previsibilidade
              </h1>
              <p className="df-text-secondary max-w-xl text-base font-semibold leading-snug sm:text-lg sm:leading-snug">
                Da arquitetura de atendimento ao painel operacional, a DevFlow configura o fluxo completo com
                inbox multiatendente, automação e IA aplicada ao repetitivo.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-4">
              <WhatsAppCta
                size="lg"
                label="Agendar diagnóstico"
                text="Quero agendar um diagnóstico da minha operação de atendimento e vendas no WhatsApp."
                className={cn(
                  "w-full min-h-[3.25rem] justify-center df-shadow-cta sm:w-auto sm:min-w-[min(100%,17.5rem)]",
                  "ring-2 ring-[color-mix(in_srgb,var(--devflow-brand)_35%,transparent)] ring-offset-2 ring-offset-background"
                )}
              />
              <Link
                href="/demo"
                className={cn(
                  "inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl border-2 df-border-brand bg-card px-6 text-base font-semibold text-foreground",
                  "shadow-sm transition-all hover:border-primary/40 hover:bg-primary/10 sm:w-auto sm:min-w-[11rem]"
                )}
              >
                {PRIMARY_DEMO_CTA_LABEL}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

            <ul className="grid gap-3 sm:max-w-xl" role="list">
              {heroPoints.map((point) => (
                <li
                  key={point}
                  className="df-text-secondary flex items-start gap-3 text-sm leading-snug sm:text-[0.95rem]"
                >
                  <CheckCircle2 className="mt-0.5 size-[1.05rem] shrink-0 df-status-brand" aria-hidden />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <p className="df-text-secondary text-xs leading-relaxed sm:text-sm">
              Já é cliente?{" "}
              <Link
                href={whatsappAppUrl("/inbox")}
                className="font-semibold text-foreground underline decoration-border underline-offset-4 hover:text-primary hover:decoration-primary/40"
              >
                Abrir inbox
              </Link>
              <span className="df-text-muted"> · </span>
              <Link
                href="/contato"
                className="font-semibold text-foreground underline decoration-border underline-offset-4 hover:text-primary hover:decoration-primary/40"
              >
                Falar com especialista
              </Link>
            </p>
          </div>

          <div className="relative">
            <div
              className="df-wa-hero-aureole pointer-events-none absolute -inset-1 -z-10 rounded-[1.35rem] opacity-70 blur-sm"
              aria-hidden
            />
            <div className="df-surface-elevated overflow-hidden rounded-3xl border df-border-brand bg-card shadow-[0_24px_80px_-12px_rgba(0,0,0,0.35)]">
              <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2.5">
                <span className="flex gap-1.5" aria-hidden>
                  <span className="size-2.5 rounded-full df-dot-danger opacity-90" />
                  <span className="size-2.5 rounded-full df-dot-warning opacity-90" />
                  <span className="size-2.5 rounded-full df-dot-brand opacity-90" />
                </span>
                <p className="df-text-secondary ml-2 min-w-0 flex-1 truncate text-center text-[11px] font-medium">
                  Operações · agora
                </p>
                <span className="rounded-full df-bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide df-status-brand">
                  Ao vivo
                </span>
              </div>

              <div className="space-y-5 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold tracking-tight df-text-primary">Painel operacional</p>
                  <span className="text-[11px] font-semibold df-status-brand">Atualizado agora</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <article className="rounded-2xl border border-border bg-muted/20 p-4 shadow-sm">
                    <MessageCircleMore className="size-4 df-status-brand" aria-hidden />
                    <p className="df-text-primary mt-2.5 text-2xl font-bold tabular-nums tracking-tight">1.284</p>
                    <p className="df-text-secondary mt-0.5 text-[11px] font-medium leading-tight">
                      Mensagens · últimas 24h
                    </p>
                  </article>
                  <article className="rounded-2xl border border-border bg-muted/20 p-4 shadow-sm">
                    <Users2 className="size-4 df-status-info" aria-hidden />
                    <p className="df-text-primary mt-2.5 text-2xl font-bold tabular-nums tracking-tight">74%</p>
                    <p className="df-text-secondary mt-0.5 text-[11px] font-medium leading-tight">
                      Fechadas sem humano
                    </p>
                  </article>
                  <article className="rounded-2xl border border-border bg-muted/20 p-4 shadow-sm">
                    <BarChart3 className="size-4 df-status-success" aria-hidden />
                    <p className="df-text-primary mt-2.5 text-2xl font-bold tabular-nums tracking-tight">+31%</p>
                    <p className="df-text-secondary mt-0.5 text-[11px] font-medium leading-tight">
                      Lead → venda · vs. semana passada
                    </p>
                  </article>
                </div>

                <div className="rounded-2xl border border-border bg-muted/25 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="df-text-secondary text-[11px] font-bold uppercase tracking-wider">
                      Fila priorizada
                    </p>
                    <span className="text-[10px] font-bold df-status-warning">2 SLA no limite</span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {queueItems.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 rounded-xl border border-border/80 bg-background px-3 py-2.5 shadow-sm"
                      >
                        <span className={cn("size-2 shrink-0 rounded-full ring-2 ring-black/5", item.dot)} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="truncate text-xs font-semibold text-foreground">{item.name}</p>
                            <span className="df-text-secondary shrink-0 rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                              {item.tag}
                            </span>
                          </div>
                          <p className="df-text-secondary mt-0.5 truncate text-[11px]">{item.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
