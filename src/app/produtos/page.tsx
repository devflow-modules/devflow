import type { Metadata } from "next";
import Link from "next/link";
import { Package, MessageCircle, Wallet, Sparkles, ArrowRight } from "lucide-react";
import { CtaBlock } from "@/components/sections/cta-block";
import { RelatedLinks } from "@/components/shared/related-links";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";

const PRODUCTS = [
  {
    slug: "whatsapp-platform",
    icon: MessageCircle,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    title: "WhatsApp Platform",
    subtitle: "Atendimento automatizado e escalável",
    description:
      "Automatize respostas no WhatsApp com IA, handoff humano e métricas operacionais. Infraestrutura pronta para alto volume.",
    cta: "Começar agora",
    href: "/produtos/whatsapp-platform",
    disabled: false,
  },
  {
    slug: "financeiro",
    icon: Wallet,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
    title: "Sistema Financeiro",
    subtitle: "Gestão completa da operação",
    description:
      "Controle de receitas, despesas, orçamentos e fechamento mensal. PF, PJ e sociedade.",
    cta: "Testar grátis",
    href: "/ferramentas/financeiro",
    disabled: false,
  },
  {
    slug: "funklab-studio",
    icon: Sparkles,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-400",
    title: "FunkLab Studio",
    subtitle: "Em breve",
    description:
      "Novos produtos em desenvolvimento. Acompanhe os lançamentos no site.",
    cta: "Em breve",
    href: "/produtos/funklab-studio",
    disabled: true,
  },
];

export const metadata: Metadata = {
  title: "Produtos | DevFlow Labs — Sistemas e plataformas",
  description:
    "Produtos da DevFlow Labs: WhatsApp Platform (atendimento automatizado), Sistema Financeiro e mais. Sistemas para automatizar, organizar e escalar operações.",
  alternates: {
    canonical: `${baseUrl}/produtos`,
  },
  openGraph: {
    title: "Produtos | DevFlow Labs",
    description:
      "Sistemas e plataformas para automatizar, organizar e escalar operações. WhatsApp Platform, Sistema Financeiro e mais.",
    url: `${baseUrl}/produtos`,
    type: "website",
  },
};

export default function ProdutosPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section
        className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 py-20"
        aria-labelledby="produtos-heading"
      >
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div
            className="absolute -top-40 -right-40 h-80 w-80 rounded-full opacity-30"
            style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)" }}
          />
        </div>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary mb-6">
              <Package className="size-3.5" aria-hidden />
              SaaS + automação
            </div>
            <h1
              id="produtos-heading"
              className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              Quando você precisa de mais que ferramenta grátis
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              WhatsApp no automático, financeiro completo — o que roda negócio de verdade.
            </p>
          </div>
        </div>
      </section>

      {/* Lista de produtos */}
      <section
        id="lista-produtos"
        className="py-24 bg-white"
        aria-labelledby="lista-heading"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2 id="lista-heading" className="sr-only">
            Lista de produtos
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((product) => {
              const Icon = product.icon;
              const card = (
                <article
                  className={cn(
                    "flex flex-col rounded-2xl border bg-card p-6",
                    "transition-all duration-200",
                    !product.disabled && "hover:-translate-y-1 hover:shadow-lg",
                    product.disabled && "opacity-80 border-dashed border-slate-200"
                  )}
                >
                  <div className={cn("flex size-10 items-center justify-center rounded-xl", product.iconBg)}>
                    <Icon className={cn("size-5", product.iconColor)} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{product.title}</h3>
                  <p className="text-sm text-muted-foreground">{product.subtitle}</p>
                  <p className="mt-2 flex-1 text-sm text-slate-600">{product.description}</p>
                  {product.disabled ? (
                    <span className="mt-4 inline-flex items-center rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-500">
                      {product.cta}
                    </span>
                  ) : (
                    <Link
                      href={product.href}
                      className={cn(
                        "mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
                        "bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                      )}
                    >
                      {product.cta}
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  )}
                </article>
              );

              return product.disabled ? (
                <div key={product.slug}>{card}</div>
              ) : (
                <Link key={product.slug} href={product.href} className="block">
                  {card}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <CtaBlock
        title="Quer resolver algo na hora, de graça?"
        subtitle="CNPJ, divisão de contas, simuladores — abre e usa."
        primaryLabel="Usar agora"
        primaryHref="/ferramentas"
      />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-16">
        <RelatedLinks variant="produtos" title="Explore o ecossistema" />
      </div>
    </div>
  );
}
