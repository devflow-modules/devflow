import Link from "next/link";
import { ChevronRight, ArrowRight, Wallet, SplitSquareHorizontal, Building2, MessageCircle } from "lucide-react";
import type { GrowthPage } from "@/lib/seo/growth-types";
import { cn } from "@/lib/utils";
import { ComparisonTable } from "./ComparisonTable";
import { StepsSection } from "./StepsSection";
import { RelatedPagesGrid } from "./RelatedPagesGrid";
import { FaqSection, getDefaultFaqFromContent } from "./FaqSection";
import { TrustSection } from "./TrustSection";

const BASE_URL = "https://devflowlabs.com.br";

const PILLAR_LABELS: Record<string, string> = {
  "controle-financeiro-completo": "controle financeiro completo",
  "como-organizar-financas-pessoais": "como organizar finanças pessoais",
  "melhor-app-para-controlar-financas": "melhor app para controlar finanças",
};

const TOOL_CONFIG = {
  financeiro: {
    href: "/ferramentas/financeiro",
    shortHref: "/ferramentas/financeiro",
    label: "Testar grátis",
    shortLabel: "Financeiro DevFlow",
    icon: Wallet,
    bullets: [
      "PF, PJ e contexto compartilhado",
      "Orçamentos, recorrências e fechamento mensal",
      "Importação CSV e visão por categoria",
    ],
  },
  divisao: {
    href: "/ferramentas/divisao-de-contas",
    shortHref: "/ferramentas/divisao-de-contas",
    label: "Abrir divisão de contas",
    shortLabel: "Divisão de contas",
    icon: SplitSquareHorizontal,
    bullets: [
      "Rateio igual ou proporcional à renda",
      "Vários participantes",
      "Resultado na hora, gratuito",
    ],
  },
  cnpj: {
    href: "/ferramentas/consulta-cnpj",
    shortHref: "/ferramentas/consulta-cnpj",
    label: "Consultar CNPJ",
    shortLabel: "Consulta CNPJ",
    icon: Building2,
    bullets: [
      "Dados públicos da Receita Federal",
      "Resposta em segundos",
      "Útil para validar fornecedores",
    ],
  },
} as const;

type Props = {
  page: GrowthPage;
  relatedPages: GrowthPage[];
};

const categoryLabel: Record<GrowthPage["category"], string> = {
  comparative: "Comparativo",
  problem_solution: "Problema → solução",
  use_case: "Caso de uso",
};

export function GrowthPageTemplate({ page, relatedPages }: Props) {
  const tool = TOOL_CONFIG[page.tool];
  const Icon = tool.icon;
  const relatedCards = relatedPages.map((p) => ({
    slug: p.slug,
    h1: p.h1,
    description: p.description,
  }));
  const faqItems = page.faq && page.faq.length >= 3 ? page.faq : getDefaultFaqFromContent(page.h1, page.intro);
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.h1,
    description: page.description,
    url: `${BASE_URL}/${page.slug}`,
    publisher: { "@type": "Organization", name: "DevFlow Labs", url: BASE_URL },
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-gradient-to-b from-white to-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {/* Hero */}
      <section className="relative overflow-x-clip pt-10 pb-8 sm:pt-14 sm:pb-10 lg:pt-16 lg:pb-12">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div
            className="absolute -top-40 right-0 h-72 w-72 rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)",
            }}
          />
        </div>
        <div className="mx-auto max-w-[1200px] px-3 min-[400px]:px-4 sm:px-6 lg:px-8">
          <nav
            className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-muted-foreground sm:text-sm"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="font-medium hover:text-primary">
              DevFlow Labs
            </Link>
            <ChevronRight className="size-4 opacity-50" aria-hidden />
            <Link href="/ferramentas" className="font-medium hover:text-primary">
              Ferramentas
            </Link>
            <ChevronRight className="size-4 opacity-50" aria-hidden />
            <span className="line-clamp-2 min-w-0 max-w-full text-foreground sm:max-w-[min(100%,420px)] sm:truncate">
              {page.h1}
            </span>
          </nav>

          <div className="mt-4 inline-flex max-w-full rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary sm:mt-6 sm:px-3 sm:text-xs">
            {categoryLabel[page.category]}
          </div>

          <h1 className="mt-3 max-w-[820px] text-balance text-2xl font-bold tracking-tight text-foreground min-[400px]:text-[1.65rem] sm:mt-4 sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
            {page.h1}
          </h1>
          <p className="mt-4 max-w-[720px] text-base leading-relaxed text-slate-600 sm:mt-6 sm:text-lg">
            {page.intro}
          </p>
          {page.pillarSlug && (
            <p className="mt-4 max-w-[720px] text-sm text-slate-600">
              Para um guia completo, leia:{" "}
              <Link href={`/${page.pillarSlug}`} className="font-medium text-primary underline-offset-4 hover:underline">
                {PILLAR_LABELS[page.pillarSlug] ?? page.pillarSlug}
              </Link>
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2 text-sm sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
            <Link
              href="/ferramentas"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Hub de ferramentas
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href="/produtos"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Produtos
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href={tool.shortHref}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {tool.shortLabel}
            </Link>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section
        className="border-y border-border bg-white py-12 sm:py-14"
        aria-labelledby="growth-problem-heading"
      >
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
          <h2
            id="growth-problem-heading"
            className="text-xl font-semibold text-foreground sm:text-2xl"
          >
            Onde a maioria erra
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            {page.problem}
          </p>
        </div>
      </section>

      {/* Solution */}
      <section className="py-12 sm:py-14" aria-labelledby="growth-solution-heading">
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="growth-solution-heading"
            className="text-xl font-semibold text-foreground sm:text-2xl"
          >
            O que funciona na prática
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            {page.solution}
          </p>
        </div>
      </section>

      {/* Steps */}
      <div className="border-t border-border bg-[#f8fafc]">
        <StepsSection steps={page.steps} />
      </div>

      {/* Comparison (optional) */}
      {page.showComparison && (
        <section
          className="border-t border-border bg-white py-14 sm:py-16"
          aria-labelledby="growth-compare-heading"
        >
          <div className="mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8">
            <h2
              id="growth-compare-heading"
              className="text-2xl font-semibold tracking-tight text-foreground"
            >
              Planilha × app comum × DevFlow
            </h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Visão honesta: cada coluna tem força em contextos diferentes. O DevFlow
              foi pensado para quem precisa de PF, PJ e casa no mesmo ecossistema.
            </p>
            <div className="mt-8">
              <ComparisonTable />
            </div>
          </div>
        </section>
      )}

      {/* Scenarios */}
      <section
        className="border-t border-border bg-slate-50 py-12 sm:py-14"
        aria-labelledby="growth-scenarios-heading"
      >
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
          <h2
            id="growth-scenarios-heading"
            className="text-lg font-semibold text-foreground"
          >
            Cenários reais
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            {page.scenarios}
          </p>
        </div>
      </section>

      {/* Extra sections (pilares: comparações, exemplos, checklist) */}
      {page.extraSections && page.extraSections.length > 0 && (
        <div className="border-t border-border bg-white">
          {page.extraSections.map((sec, i) => (
            <section
              key={i}
              className="py-10 sm:py-12"
              aria-labelledby={`extra-heading-${i}`}
            >
              <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
                <h2
                  id={`extra-heading-${i}`}
                  className="text-lg font-semibold text-foreground sm:text-xl"
                >
                  {sec.title}
                </h2>
                <p className="mt-3 text-base leading-relaxed text-slate-700">
                  {sec.content}
                </p>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Tool CTA */}
      <section
        className="border-t border-border bg-white py-14 sm:py-16"
        aria-labelledby="growth-tool-heading"
      >
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
          <h2 id="growth-tool-heading" className="sr-only">
            Ferramenta recomendada
          </h2>
          <div className="overflow-hidden rounded-2xl border-2 border-primary/25 bg-gradient-to-br from-primary/5 to-white shadow-lg">
            <div className="border-b border-primary/10 bg-primary/10 px-6 py-4 sm:px-8">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                Recomendação DevFlow
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                Use agora: {tool.shortLabel}
              </p>
            </div>
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <ul className="space-y-2 text-sm text-slate-700" role="list">
                {tool.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="text-primary" aria-hidden>
                      ✓
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href={tool.href}
                className={cn(
                  "mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold sm:mt-8 sm:w-auto sm:px-6 sm:py-4 sm:text-base",
                  "bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                )}
              >
                <Icon className="size-5" aria-hidden />
                {tool.label}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <p className="mt-4 text-center text-sm text-muted-foreground sm:text-left">
                <Link href="/ferramentas" className="font-medium text-primary hover:underline">
                  Usar agora
                </Link>
                {" · "}
                <Link href="/produtos" className="font-medium text-primary hover:underline">
                  Começar agora
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <FaqSection items={faqItems} pageUrl={`/${page.slug}`} baseUrl={BASE_URL} />

      <TrustSection toolHref={tool.href} toolLabel={tool.shortLabel} />

      <RelatedPagesGrid
        pages={relatedCards}
        title="Continue lendo"
        subtitle="Guias relacionados para ir mais fundo no mesmo tema."
      />

      {/* Final CTA */}
      <section className="border-t border-border bg-[#f1f5f9] py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              Pronto para organizar de verdade?
            </h2>
            <p className="mt-3 text-slate-600">
              Ferramentas gratuitas e produtos para escalar operação e atendimento.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-center">
              <Link
                href="/ferramentas"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Usar agora
              </Link>
              <Link
                href="/produtos"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-white px-6 py-3 font-semibold hover:bg-slate-50"
              >
                Começar agora
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Empresa com alto volume no WhatsApp?{" "}
              <Link
                href="/produtos/whatsapp-platform"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp Platform
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
