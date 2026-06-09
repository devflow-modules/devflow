"use client";

import Link from "next/link";
import { Wrench, Package, MessageCircle, ArrowRight } from "lucide-react";
import { trackHomeCta } from "@/lib/analytics";
import { ECOSYSTEM_SECTION_LABEL } from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

const pillars = [
  {
    id: "automation" as const,
    icon: MessageCircle,
    title: "WhatsApp Platform",
    badge: "Principal",
    cta: "Conhecer a plataforma",
    value: "Operação de atendimento e vendas com inbox, IA, handoff e dashboard.",
    href: "/produtos/whatsapp-platform",
    accent: "border-emerald-500/25 bg-emerald-500/[0.04] hover:border-emerald-500/40",
    iconBg: "bg-emerald-500/15 text-emerald-700",
  },
  {
    id: "tools" as const,
    icon: Wrench,
    title: "Ferramentas",
    badge: "Grátis",
    cta: "Ver ferramentas",
    value: "Utilitários no browser para tarefas pontuais do dia a dia.",
    href: "/ferramentas",
    accent: "border-primary/25 bg-primary/[0.04] hover:border-primary/40",
    iconBg: "bg-primary/15 text-primary",
  },
  {
    id: "products" as const,
    icon: Package,
    title: "Produtos",
    badge: "Complementar",
    cta: "Ver catálogo",
    value: "Financeiro e outros módulos que complementam a operação.",
    href: "/produtos",
    accent: "border-sky-400/30 bg-sky-400/[0.08] hover:border-sky-300/45",
    iconBg: "bg-sky-400/20 text-sky-200",
  },
];

export function HubPillarsSection() {
  return (
    <section
      id="hub-pilares"
      className="border-y df-border-brand bg-[var(--devflow-background)] py-14 sm:py-20 lg:py-24"
      aria-labelledby="hub-pillars-heading"
    >
      <div className="mx-auto max-w-[1200px] px-3 min-[400px]:px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-muted-foreground/30 sm:mb-4" aria-hidden />
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">{ECOSYSTEM_SECTION_LABEL}</p>
          <h2
            id="hub-pillars-heading"
            className="df-text-primary text-balance text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl"
          >
            Tudo conectado — WhatsApp Platform no centro
          </h2>
          <p className="df-text-secondary mt-3 text-base leading-relaxed sm:text-lg">
            A operação no WhatsApp é a prioridade. Ferramentas e produtos complementam quando precisar.
          </p>
        </div>

        <ul className="mt-10 grid auto-rows-fr gap-6 sm:mt-12 sm:grid-cols-3 sm:gap-8 lg:mt-14" role="list">
          {pillars.map((p) => (
            <li key={p.id}>
              <Link
                href={p.href}
                onClick={() => {
                  if (p.id === "tools") trackHomeCta("hub_pillar_tools");
                  else if (p.id === "products") trackHomeCta("hub_pillar_products");
                  else trackHomeCta("hub_pillar_automation");
                }}
                className={cn(
                  "group flex h-full min-h-0 flex-col rounded-2xl border-2 bg-card p-5 sm:p-7 lg:p-8",
                  "shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-all duration-300",
                  "hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(15,23,42,0.1)]",
                  p.accent
                )}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-12",
                      p.iconBg
                    )}
                  >
                    <p.icon className="size-5 sm:size-6" aria-hidden />
                  </div>
                  <span className="df-text-secondary max-w-[48%] shrink-0 truncate rounded-full border border-border bg-muted/35 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:max-w-none sm:px-2.5 sm:text-[10px]">
                    {p.badge}
                  </span>
                </div>
                <h3 className="df-text-primary mt-3 text-pretty text-base font-bold group-hover:text-primary sm:mt-4 sm:text-lg">
                  {p.title}
                </h3>
                <p className="df-text-secondary mt-2 flex-1 text-sm leading-relaxed">
                  {p.value}
                </p>
                <span className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-primary sm:mt-5">
                  {p.cta}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
