"use client";

import Link from "next/link";
import { Wrench, Package, MessageCircle, ArrowRight } from "lucide-react";
import { trackHomeCta } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const pillars = [
  {
    id: "tools" as const,
    icon: Wrench,
    title: "Ferramentas",
    badge: "Grátis",
    cta: "Usar agora",
    value: "Resolva tarefas do dia a dia em segundos.",
    href: "/ferramentas",
    accent: "border-primary/25 bg-primary/[0.04] hover:border-primary/40",
    iconBg: "bg-primary/15 text-primary",
  },
  {
    id: "products" as const,
    icon: Package,
    title: "Produtos",
    badge: "SaaS",
    cta: "Começar agora",
    value: "Sistemas completos para escalar sua operação.",
    href: "/produtos",
    accent: "border-blue-500/20 bg-blue-500/[0.04] hover:border-blue-500/35",
    iconBg: "bg-blue-500/15 text-blue-600",
  },
  {
    id: "automation" as const,
    icon: MessageCircle,
    title: "Automações",
    badge: "WhatsApp + IA",
    cta: "Começar agora",
    value: "Deixe processos rodando no automático.",
    href: "/automacao-whatsapp",
    accent: "border-emerald-500/25 bg-emerald-500/[0.04] hover:border-emerald-500/40",
    iconBg: "bg-emerald-500/15 text-emerald-700",
  },
];

export function HubPillarsSection() {
  return (
    <section
      id="hub-pilares"
      className="border-y border-border bg-slate-50 py-16 sm:py-20"
      aria-labelledby="hub-pillars-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="hub-pillars-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Um único hub para tudo que sua operação precisa
          </h2>
          <p className="mt-3 text-base text-slate-600 sm:text-lg">
            Pare de usar 5, 10 ferramentas diferentes. Centralize tudo na DevFlow.
          </p>
        </div>

        <ul className="mt-12 grid gap-6 sm:grid-cols-3" role="list">
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
                  "group flex h-full flex-col rounded-2xl border-2 bg-card p-6 sm:p-7",
                  "shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-all duration-300",
                  "hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(15,23,42,0.1)]",
                  p.accent
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "flex size-12 items-center justify-center rounded-xl",
                      p.iconBg
                    )}
                  >
                    <p.icon className="size-6" aria-hidden />
                  </div>
                  <span className="rounded-full border border-border bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {p.badge}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground group-hover:text-primary">
                  {p.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  {p.value}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
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
