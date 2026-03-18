import Link from "next/link";
import { Wallet, SplitSquareHorizontal, Building2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const tools = [
  {
    icon: Wallet,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    badge: "SaaS",
    badgeColor: "bg-primary/10 text-primary",
    title: "Financeiro",
    description:
      "Controle completo de receitas, despesas e orçamentos para pessoa física, jurídica e sociedade.",
    features: ["Múltiplos contextos (PF, PJ, Sociedade)", "Fechamento mensal", "Importação CSV"],
    cta: "Acessar",
    href: "/ferramentas/financeiro",
    highlight: true,
  },
  {
    icon: SplitSquareHorizontal,
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
    badge: "Grátis",
    badgeColor: "bg-accent/10 text-accent",
    title: "Divisão de Contas",
    description:
      "Divida despesas entre pessoas de forma simples e rápida. Sem cadastro, sem complicação.",
    features: ["Cálculo instantâneo", "Compartilhamento fácil", "Zero cadastro"],
    cta: "Usar agora",
    href: "/ferramentas/divisao-de-contas",
    highlight: false,
  },
  {
    icon: Building2,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    badge: "Grátis",
    badgeColor: "bg-orange-500/10 text-orange-500",
    title: "Consulta CNPJ",
    description:
      "Consulte dados completos de qualquer empresa por CNPJ em segundos. Situação, porte, sócios e mais.",
    features: ["Dados da Receita Federal", "Retorno em &lt;1 segundo", "Sem limite de consultas"],
    cta: "Consultar",
    href: "/ferramentas/cnpj",
    highlight: false,
  },
];

export function ToolsSection() {
  return (
    <section
      id="ferramentas"
      className="py-24 bg-white"
      aria-labelledby="tools-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="tools-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Ferramentas prontas para usar no seu dia a dia
          </h2>
          <p className="mt-3 text-slate-600">
            Acesse agora. Sem instalação, sem configuração complexa.
          </p>
        </div>

        {/* Grid de ferramentas */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <article
              key={tool.title}
              className={cn(
                "group relative flex flex-col rounded-2xl border bg-card p-6",
                "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
                tool.highlight
                  ? "border-primary/30 shadow-[0_0_0_1px_rgba(34,197,94,0.15)] bg-primary/[0.02]"
                  : "border-border"
              )}
            >
              {tool.highlight && (
                <div className="absolute -top-3 left-6">
                  <span className="rounded-full border border-primary/30 bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Popular
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between">
                <div className={cn("flex size-10 items-center justify-center rounded-xl", tool.iconBg)}>
                  <tool.icon className={cn("size-5", tool.iconColor)} aria-hidden />
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide", tool.badgeColor)}>
                  {tool.badge}
                </span>
              </div>

              <h3 className="mt-4 text-lg font-semibold text-foreground">{tool.title}</h3>
              <p
                className="mt-2 flex-1 text-sm text-slate-600"
                dangerouslySetInnerHTML={{ __html: tool.description }}
              />

              <ul className="mt-4 space-y-1.5">
                {tool.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-xs text-slate-500"
                    dangerouslySetInnerHTML={{
                      __html: `<svg class="size-3.5 shrink-0 text-primary inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> ${feature}`,
                    }}
                  />
                ))}
              </ul>

              <Link
                href={tool.href}
                className={cn(
                  "mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
                  "transition-all duration-200",
                  tool.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border bg-white text-foreground hover:bg-slate-50"
                )}
              >
                {tool.cta}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
