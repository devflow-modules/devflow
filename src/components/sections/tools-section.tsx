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
    pain: "Ainda fechando o mês na planilha?",
    benefit: "Vê receitas, despesas e orçamento num só lugar — sem planilha.",
    description:
      "PF, PJ ou sociedade: controle que acompanha sua operação de verdade.",
    features: ["No navegador, sem instalar", "Orçamento e recorrência", "Teste antes de se comprometer"],
    cta: "Usar agora",
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
    pain: "Cansado de dividir contas na mão?",
    benefit: "Divida automaticamente e evite erros.",
    description: "Casal, república ou viagem — rateio na hora, direto no browser.",
    features: ["Sem instalação", "Cálculo na hora", "Grátis"],
    cta: "Usar agora",
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
    pain: "Precisa checar empresa antes de fechar negócio?",
    benefit: "Dados oficiais em segundos — menos risco.",
    description: "Situação, razão social e mais, direto da Receita.",
    features: ["Resposta rápida", "Sem burocracia", "Grátis"],
    cta: "Usar agora",
    href: "/ferramentas/consulta-cnpj",
    highlight: false,
  },
];

export function ToolsSection() {
  return (
    <section
      id="ferramentas"
      className="py-20 sm:py-28 bg-white"
      aria-labelledby="tools-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="tools-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl"
          >
            Ferramentas que você usa hoje, não “algum dia”
          </h2>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            Cada uma mata uma dor específica. Leva menos de 1 minuto pra testar.
          </p>
          <p className="mx-auto mt-4 max-w-xl rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm font-semibold text-amber-950">
            Resolver isso manualmente custa tempo todos os dias.
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <article
              key={tool.id}
              className={cn(
                "group relative flex flex-col rounded-2xl border-2 bg-card p-7",
                "shadow-[0_6px_32px_rgba(15,23,42,0.07)] transition-all duration-300",
                "hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]",
                tool.highlight
                  ? "border-primary/40 ring-1 ring-primary/10"
                  : "border-border hover:border-primary/25"
              )}
            >
              {tool.highlight && (
                <div className="absolute -top-3 left-7">
                  <span className="rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                    Mais usado
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                <div className={cn("flex size-11 items-center justify-center rounded-xl", tool.iconBg)}>
                  <tool.icon className={cn("size-6", tool.iconColor)} aria-hidden />
                </div>
                {!tool.highlight && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                      tool.badgeColor
                    )}
                  >
                    {tool.badge}
                  </span>
                )}
              </div>

              <h3 className="mt-5 text-xl font-bold text-foreground">{tool.title}</h3>

              <p className="mt-2 text-sm font-medium text-slate-500">{tool.pain}</p>
              <p className="mt-1 text-sm font-semibold text-primary">{tool.benefit}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{tool.description}</p>

              <ul className="mt-4 space-y-2 border-t border-border pt-4" role="list">
                {tool.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={tool.href}
                onClick={() => trackToolCardClick(tool.id)}
                className={cn(
                  "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold",
                  "transition-all duration-200",
                  tool.highlight
                    ? "bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(34,197,94,0.3)] hover:bg-[#16a34a] hover:shadow-lg"
                    : "border-2 border-slate-200 bg-white text-foreground hover:border-primary/40 hover:bg-primary/5"
                )}
              >
                {tool.cta} (leva menos de 1 min)
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <p className="mt-2 text-center text-[11px] font-medium text-slate-500">
                Sem cartão · Sem compromisso · Você pode parar quando quiser
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
