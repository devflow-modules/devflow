"use client";

import Link from "next/link";
import { Zap, TrendingUp, MessageCircle, ArrowRight } from "lucide-react";
import { trackHomeCta } from "@/lib/analytics";
import {
  ECOSYSTEM_SECTION_LABEL,
  PRIMARY_CONVERT_CTA_LABEL,
  PRIMARY_CONVERT_HREF,
} from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

const paths = [
  {
    title: "Quer operação no WhatsApp?",
    body: "Diagnóstico, implementação guiada e inbox com IA, handoff humano e dashboard operacional.",
    cta: PRIMARY_CONVERT_CTA_LABEL,
    href: PRIMARY_CONVERT_HREF,
    icon: MessageCircle,
    track: "hub_pillar_automation" as const,
    foot: "Solução principal · API oficial Meta",
    accent: "df-border-brand df-bg-brand-soft hover:border-[color-mix(in_srgb,var(--devflow-brand)_40%,transparent)]",
    iconClass: "df-bg-brand-soft df-status-brand",
    featured: true,
  },
  {
    title: "Precisa de uma ferramenta rápida?",
    body: "Utilitários gratuitos no browser — CNPJ, divisão de contas e simuladores.",
    cta: "Ver ferramentas gratuitas",
    href: "/ferramentas",
    icon: Zap,
    track: "hub_pillar_tools" as const,
    foot: "Grátis · Complementar à operação principal",
    accent: "border-primary/30 bg-primary/[0.06] hover:border-primary/50",
    iconClass: "bg-primary/15 text-primary",
    featured: false,
  },
  {
    title: "Quer conhecer outros produtos?",
    body: "Financeiro e módulos complementares do ecossistema DevFlow Labs.",
    cta: "Ver catálogo de produtos",
    href: "/produtos",
    icon: TrendingUp,
    track: "hub_pillar_products" as const,
    foot: "Complementar · Não substitui a WhatsApp Platform",
    accent: "df-border-brand bg-[var(--devflow-surface-elevated)] hover:border-[color-mix(in_srgb,var(--devflow-brand)_25%,transparent)]",
    iconClass: "bg-muted/50 df-text-secondary",
    featured: false,
  },
];

export function WhereToStartSection() {
  return (
    <section
      id="por-onde-comecar"
      className="border-y df-border-brand bg-gradient-to-b from-[var(--devflow-surface)] to-[var(--devflow-background)] py-10 sm:py-14 lg:py-16"
      aria-labelledby="where-start-heading"
    >
      <div className="mx-auto max-w-[1200px] px-3 min-[400px]:px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-muted-foreground/30 sm:mb-4" aria-hidden />
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">{ECOSYSTEM_SECTION_LABEL}</p>
          <h2
            id="where-start-heading"
            className="df-text-primary text-balance text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl"
          >
            Outros caminhos no ecossistema
          </h2>
          <p className="df-text-secondary mt-3 leading-relaxed">
            Se atendimento no WhatsApp não é sua urgência agora, explore as opções complementares.
          </p>
        </div>

        <ul className="mt-10 grid gap-6 lg:grid-cols-3" role="list">
          {paths.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                onClick={() => trackHomeCta(p.track)}
                className={cn(
                  "flex h-full min-h-0 flex-col rounded-2xl border-2 p-5 sm:p-6 lg:p-7",
                  "shadow-sm transition-all duration-300",
                  "hover:-translate-y-1 hover:shadow-lg",
                  p.accent,
                  p.featured && "ring-1 ring-[color-mix(in_srgb,var(--devflow-brand)_20%,transparent)]"
                )}
              >
                <div
                  className={cn(
                    "flex size-12 items-center justify-center rounded-xl",
                    p.iconClass
                  )}
                >
                  <p.icon className="size-6" aria-hidden />
                </div>
                <h3 className="df-text-primary mt-3 text-pretty text-base font-bold sm:mt-4 sm:text-lg">{p.title}</h3>
                <p className="df-text-secondary mt-2 flex-1 text-sm leading-relaxed">{p.body}</p>
                <span className="mt-5 inline-flex min-h-10 flex-wrap items-center gap-2 text-left text-sm font-bold leading-snug text-primary sm:mt-6">
                  {p.cta}
                  <ArrowRight className="size-4 shrink-0" aria-hidden />
                </span>
                <p className="df-text-muted mt-3 text-xs font-medium leading-relaxed">{p.foot}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
