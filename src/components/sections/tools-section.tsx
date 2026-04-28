"use client";

import Link from "next/link";
import { Wallet, SplitSquareHorizontal, Building2, ArrowRight } from "lucide-react";
import { trackToolCardClick } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const tools = [
  {
    id: "financeiro",
    icon: Wallet,
    iconBg: "bg-primary/12",
    iconColor: "text-primary",
    badge: "Mais usado",
    badgeColor: "bg-primary text-white",
    title: "Financeiro",
    pain: "Planilha que ninguém atualiza?",
    benefit: "Tudo num painel — orçamento, recorrência, mês fechado.",
    description: "PF, PJ ou sociedade.",
    features: ["No browser", "Orçamento claro", "Teste antes de cravar"],
    href: "/ferramentas/financeiro",
    highlight: true,
  },
  {
    id: "divisao",
    icon: SplitSquareHorizontal,
    iconBg: "bg-sky-500/12",
    iconColor: "text-sky-600",
    badge: "Grátis",
    badgeColor: "bg-sky-500/15 text-sky-700 border border-sky-500/25",
    title: "Divisão de contas",
    pain: "Dividir conta na mão?",
    benefit: "Rateio na hora, sem discussão.",
    description: "Casal, república, viagem.",
    features: ["Sem instalar", "Na hora", "Grátis"],
    href: "/ferramentas/divisao-de-contas",
    highlight: false,
  },
  {
    id: "cnpj",
    icon: Building2,
    iconBg: "bg-orange-500/12",
    iconColor: "text-orange-600",
    badge: "Grátis",
    badgeColor: "bg-orange-500/12 text-orange-800 border border-orange-500/25",
    title: "Consulta CNPJ",
    pain: "Validar empresa antes de pagar?",
    benefit: "Dados oficiais em segundos.",
    description: "Direto da Receita.",
    features: ["Rápido", "Simples", "Grátis"],
    href: "/ferramentas/consulta-cnpj",
    highlight: false,
  },
];

export function ToolsSection() {
  return (
    <section
      id="ferramentas"
      className="border-y df-border-brand bg-[var(--devflow-surface)] py-14 sm:py-20 lg:py-28"
      aria-labelledby="tools-heading"
    >
      <div className="mx-auto max-w-[1200px] px-3 min-[400px]:px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-primary sm:mb-4" aria-hidden />
          <p className="text-xs font-medium text-primary sm:text-sm">Veja na prática</p>
          <h2
            id="tools-heading"
            className="df-text-primary mt-2 text-balance text-xl font-bold tracking-tight sm:text-3xl lg:text-4xl"
          >
            Ferramentas que você usa hoje
          </h2>
          <p className="df-text-secondary mt-4 text-base leading-relaxed sm:text-lg">
            Cada uma resolve uma coisa concreta.
          </p>
          <p className="df-text-secondary mx-auto mt-5 max-w-md text-sm leading-relaxed">
            Ganhe minutos todo dia — pare de refazer o mesmo processo manual.
          </p>
        </div>

        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <article
              key={tool.id}
              className={cn(
                "group relative flex flex-col rounded-2xl border-2 bg-card p-8",
                "shadow-sm transition-all duration-300",
                "hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]",
                tool.highlight
                  ? "border-primary/35 ring-1 ring-primary/10"
                  : "border-border hover:border-primary/20"
              )}
            >
              {tool.highlight && (
                <div className="absolute -top-2.5 left-4 sm:left-8">
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm sm:px-3 sm:text-[10px]">
                    Mais usado
                  </span>
                </div>
              )}

              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className={cn("flex size-11 items-center justify-center rounded-xl", tool.iconBg)}>
                    <tool.icon className={cn("size-6", tool.iconColor)} aria-hidden />
                  </div>
                  {!tool.highlight && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide sm:px-2.5 sm:text-[10px]",
                        tool.badgeColor
                      )}
                    >
                      {tool.badge}
                    </span>
                  )}
                </div>

                <h3 className="df-text-primary mt-5 text-pretty text-lg font-bold sm:mt-6 sm:text-xl">{tool.title}</h3>

                <p className="df-text-secondary mt-3 text-sm">{tool.pain}</p>
                <p className="mt-1 text-sm font-semibold text-primary">{tool.benefit}</p>
                <p className="df-text-secondary mt-2 text-sm leading-relaxed">{tool.description}</p>

                <ul className="mt-5 space-y-2.5 border-t border-border pt-5" role="list">
                  {tool.features.map((feature) => (
                    <li key={feature} className="df-text-secondary flex items-center gap-2 text-xs leading-relaxed">
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={tool.href}
                onClick={() => trackToolCardClick(tool.id)}
                className={cn(
                  "mt-6 inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-sm font-bold leading-snug sm:mt-auto sm:min-h-14 sm:py-4 sm:pt-6",
                  "transition-all duration-200",
                  tool.highlight
                    ? "bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(34,197,94,0.28)] hover:bg-[#16a34a]"
                    : "df-surface-elevated border-2 text-foreground hover:border-primary/35"
                )}
              >
                <span className="text-balance sm:hidden">Usar agora</span>
                <span className="hidden text-balance sm:inline">Usar agora — menos de 1 min</span>
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </Link>
            </article>
          ))}
        </div>

        <p className="df-text-muted mx-auto mt-12 max-w-lg text-center text-xs leading-relaxed">
          Grátis nas ferramentas acima · Sem cartão · Abre no navegador
        </p>
      </div>
    </section>
  );
}
