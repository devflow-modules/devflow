import Link from "next/link";
import { MessageCircle, Wallet, Sparkles, ArrowRight, ExternalLink } from "lucide-react";
import {
  ECOSYSTEM_PRODUCTS_DESCRIPTION,
  ECOSYSTEM_PRODUCTS_HEADING,
  ECOSYSTEM_SECTION_LABEL,
  PRIMARY_CONVERT_CTA_LABEL,
  PRIMARY_CONVERT_HREF,
} from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

const products = [
  {
    icon: MessageCircle,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    tag: "Solução principal",
    tagColor: "text-primary",
    title: "WhatsApp Platform",
    subtitle: "Atendimento e vendas no WhatsApp",
    description:
      "Inbox multiatendente, IA no repetitivo, handoff humano, SLA e dashboard operacional.",
    highlights: [
      "WhatsApp Cloud API oficial",
      "Fila priorizada e handoff",
      "IA no repetitivo, humano no crítico",
      "Diagnóstico e operação acompanhada",
    ],
    cta: PRIMARY_CONVERT_CTA_LABEL,
    href: PRIMARY_CONVERT_HREF,
    external: false,
    accent: "border-primary/30 ring-1 ring-primary/10",
    featured: true,
  },
  {
    icon: Wallet,
    iconBg: "bg-sky-400/20",
    iconColor: "text-sky-200",
    tag: "Complementar",
    tagColor: "text-sky-200",
    title: "Sistema Financeiro",
    subtitle: "Gestão financeira pessoal ou PJ",
    description:
      "Receitas, despesas e fechamento mensal — para quem precisa de controle além do atendimento.",
    highlights: [
      "Múltiplos contextos",
      "Recorrência automática",
      "Fechamento mensal",
      "Importação CSV",
    ],
    cta: "Conhecer o Financeiro",
    href: "/ferramentas/financeiro",
    external: false,
    accent: "border-sky-400/35",
    featured: false,
  },
  {
    icon: Sparkles,
    iconBg: "bg-muted/40",
    iconColor: "text-muted-foreground",
    tag: "Em breve",
    tagColor: "text-muted-foreground",
    title: "Próximo produto",
    subtitle: "Em desenvolvimento",
    description:
      "Novos módulos do ecossistema DevFlow Labs — complementares à operação no WhatsApp.",
    highlights: [
      "Acompanhe o lançamento",
      "Notificação por e-mail",
      "Acesso antecipado",
    ],
    cta: "Quero saber",
    href: "/contato",
    external: false,
    accent: "border-dashed border-border",
    disabled: true,
    featured: false,
  },
];

export function ProductsSection() {
  return (
    <section
      id="produtos"
      className="border-y df-border-brand bg-[var(--devflow-surface)] py-24 sm:py-28"
      aria-labelledby="products-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-muted-foreground/30" aria-hidden />
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">{ECOSYSTEM_SECTION_LABEL}</p>
          <h2
            id="products-heading"
            className="df-text-primary text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {ECOSYSTEM_PRODUCTS_HEADING}
          </h2>
          <p className="df-text-secondary mt-3 leading-relaxed">
            {ECOSYSTEM_PRODUCTS_DESCRIPTION}
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.title}
              className={cn(
                "flex flex-col rounded-2xl border-2 bg-card p-6 shadow-sm",
                "transition-all duration-300",
                product.disabled
                  ? "df-text-muted"
                  : "hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_16px_48px_rgba(15,23,42,0.1)]",
                product.accent
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("flex size-10 items-center justify-center rounded-xl", product.iconBg)}>
                  <product.icon className={cn("size-5", product.iconColor)} aria-hidden />
                </div>
                <div>
                  <p className={cn("text-xs font-semibold uppercase tracking-wide", product.tagColor)}>
                    {product.tag}
                  </p>
                </div>
              </div>

              <h3 className="df-text-primary mt-4 text-lg font-semibold">{product.title}</h3>
              <p className="df-text-secondary text-sm font-medium">{product.subtitle}</p>
              <p className="df-text-secondary mt-2 flex-1 text-sm leading-relaxed">{product.description}</p>

              <ul className="mt-4 space-y-1.5">
                {product.highlights.map((item) => (
                  <li key={item} className="df-text-secondary flex items-center gap-2 text-xs leading-relaxed">
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href={product.href}
                className={cn(
                  "mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
                  "transition-all duration-200",
                  product.disabled
                    ? "df-text-secondary cursor-default border border-dashed border-border bg-muted/20 pointer-events-none"
                    : product.featured
                      ? "bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(34,197,94,0.28)] hover:bg-[#16a34a]"
                      : "df-surface-elevated border border-border text-foreground hover:bg-muted/20"
                )}
                tabIndex={product.disabled ? -1 : undefined}
                aria-disabled={product.disabled}
              >
                {product.cta}
                {product.external ? (
                  <ExternalLink className="size-4" aria-hidden />
                ) : (
                  <ArrowRight className="size-4" aria-hidden />
                )}
              </Link>
            </article>
          ))}
        </div>
        <p className="df-text-muted mx-auto mt-10 max-w-md text-center text-xs leading-relaxed">
          A WhatsApp Platform é a oferta principal — demais produtos complementam o ecossistema.
        </p>
      </div>
    </section>
  );
}
