"use client";

import Link from "next/link";
import { Zap, TrendingUp, MessageCircle, ArrowRight } from "lucide-react";
import { trackHomeCta } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const paths = [
  {
    title: "Quer resolver rápido?",
    body: "Ferramentas grátis no browser — CNPJ, divisão de contas, simuladores.",
    cta: "Abrir ferramentas grátis",
    href: "/ferramentas",
    icon: Zap,
    track: "hub_pillar_tools" as const,
    foot: "Grátis · Sem cadastro pesado",
    accent: "border-primary/30 bg-primary/[0.06] hover:border-primary/50",
    iconClass: "bg-primary/15 text-primary",
  },
  {
    title: "Quer escalar de verdade?",
    body: "Sistemas completos: financeiro, WhatsApp Platform e o que vem na sequência.",
    cta: "Começar agora (leva menos de 1 min)",
    href: "/produtos",
    icon: TrendingUp,
    track: "hub_pillar_products" as const,
    foot: "Não gostou? Não usa. Sem drama.",
    accent: "border-blue-500/25 bg-blue-500/[0.05] hover:border-blue-500/40",
    iconClass: "bg-blue-500/15 text-blue-600",
  },
  {
    title: "Quer automatizar atendimento?",
    body: "Resposta na hora, 24h, com humano quando precisar.",
    cta: "Ver automação WhatsApp",
    href: "/automacao-whatsapp",
    icon: MessageCircle,
    track: "hub_pillar_automation" as const,
    foot: "Atendimento organizado 24h — você entra só no que importa",
    accent: "border-emerald-500/30 bg-emerald-500/[0.06] hover:border-emerald-500/45",
    iconClass: "bg-emerald-500/15 text-emerald-700",
  },
];

export function WhereToStartSection() {
  return (
    <section
      id="por-onde-comecar"
      className="bg-gradient-to-b from-slate-50 to-white py-10 sm:py-14 lg:py-16"
      aria-labelledby="where-start-heading"
    >
      <div className="mx-auto max-w-[1200px] px-3 min-[400px]:px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-primary sm:mb-4" aria-hidden />
          <h2
            id="where-start-heading"
            className="text-balance text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl"
          >
            Por onde começar?
          </h2>
          <p className="mt-3 text-slate-600">
            Três caminhos. Um clique.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Agora que você viu o hub, escolhe o que resolve sua urgência de hoje.
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
                  p.accent
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
                <h3 className="mt-3 text-pretty text-base font-bold text-foreground sm:mt-4 sm:text-lg">{p.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{p.body}</p>
                <span className="mt-5 inline-flex min-h-10 flex-wrap items-center gap-2 text-left text-sm font-bold leading-snug text-primary sm:mt-6">
                  {p.href === "/produtos" ? (
                    <>
                      <span className="sm:hidden">Começar agora (&lt;1 min)</span>
                      <span className="hidden sm:inline">{p.cta}</span>
                    </>
                  ) : (
                    p.cta
                  )}
                  <ArrowRight className="size-4 shrink-0" aria-hidden />
                </span>
                <p className="mt-3 text-xs font-medium text-slate-500">{p.foot}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
