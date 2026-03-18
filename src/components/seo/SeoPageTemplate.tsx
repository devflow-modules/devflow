import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { SeoPage, SeoTool } from "@/lib/seo/types";
import { cn } from "@/lib/utils";
import { UseCaseSection } from "./UseCaseSection";
import { ToolEmbedSection } from "./ToolEmbedSection";
import { RelatedPagesGrid } from "./RelatedPagesGrid";
import { FaqSection, getDefaultFaqFromContent } from "./FaqSection";
import { TrustSection } from "./TrustSection";

const BASE_URL = "https://devflowlabs.com.br";

const SEO_TOOL_TRUST: Record<SeoTool, { href: string; label: string }> = {
  divisao: { href: "/ferramentas/divisao-de-contas", label: "Divisão de contas" },
  cnpj: { href: "/ferramentas/consulta-cnpj", label: "Consulta CNPJ" },
};

type Props = {
  page: SeoPage;
  relatedPages: SeoPage[];
};

/** Split intro into two short paragraphs for the problem/explanation section. */
function problemParagraphs(page: SeoPage): [string, string] {
  const trimmed = page.intro.trim();
  const parts = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return [parts[0].trim(), parts.slice(1).join(" ").trim()];
  }
  const desc = page.description.trim();
  return [trimmed, desc.length ? desc : trimmed];
}

export function SeoPageTemplate({ page, relatedPages }: Props) {
  const [para1, para2] = problemParagraphs(page);
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
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {/* Section 1 — Hero */}
      <section
        className="relative overflow-hidden pt-12 pb-10 sm:pt-16 sm:pb-14"
        aria-labelledby="seo-hero-heading"
      >
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div
            className="absolute -top-40 -right-40 h-80 w-80 rounded-full opacity-25"
            style={{
              background:
                "radial-gradient(circle, rgba(34, 197, 94, 0.12) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.6) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <nav
            className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="font-medium hover:text-primary">
              DevFlow Labs
            </Link>
            <ChevronRight className="size-4 shrink-0 opacity-50" aria-hidden />
            <Link href="/ferramentas" className="font-medium hover:text-primary">
              Ferramentas
            </Link>
            <ChevronRight className="size-4 shrink-0 opacity-50" aria-hidden />
            <span className="max-w-[min(100%,280px)] truncate font-medium text-foreground">
              {page.h1}
            </span>
          </nav>

          <div className="mx-auto mt-8 max-w-[720px]">
            <h1
              id="seo-hero-heading"
              className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-tight"
            >
              {page.h1}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">{page.intro}</p>
          </div>
        </div>
      </section>

      {/* Section 2 — Problem / explanation */}
      <section
        className="border-y border-border bg-white py-12 sm:py-14"
        aria-labelledby="seo-explanation-heading"
      >
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
          <h2 id="seo-explanation-heading" className="sr-only">
            Contexto
          </h2>
          <div className="rounded-2xl border border-border bg-slate-50/80 p-6 sm:p-8">
            <p className="text-base leading-relaxed text-slate-700">{para1}</p>
            <p className="mt-4 text-base leading-relaxed text-slate-600">{para2}</p>
            {page.internalLinkBlurb && (
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                {page.internalLinkBlurb.before}
                <Link href={`/${page.internalLinkBlurb.slug}`} className="font-medium text-primary hover:underline">
                  {page.internalLinkBlurb.label}
                </Link>
                {page.internalLinkBlurb.after ?? ""}
              </p>
            )}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground sm:text-left">
            Parte do{" "}
            <Link href="/ferramentas" className="font-medium text-primary hover:underline">
              hub de ferramentas
            </Link>{" "}
            da DevFlow Labs — também{" "}
            <Link href="/produtos" className="font-medium text-primary hover:underline">
              produtos
            </Link>{" "}
            e{" "}
            <Link href={`/ferramentas/${page.tool === "divisao" ? "divisao-de-contas" : "consulta-cnpj"}`} className="font-medium text-primary hover:underline">
              {page.tool === "divisao" ? "divisão de contas" : "consulta CNPJ"}
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Section 3 — Use case */}
      <div className="bg-white">
        <UseCaseSection page={page} />
      </div>

      {/* Section 3b — Anti-thin: quando faz sentido, erros, exemplo, checklist */}
      {(page.whenItMakesSense ?? page.commonMistakes ?? page.example ?? page.checklist) && (
        <section className="border-t border-border bg-slate-50/60 py-12 sm:py-14" aria-labelledby="seo-deep-heading">
          <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
            <h2 id="seo-deep-heading" className="sr-only">
              Quando usar, erros comuns e exemplo
            </h2>
            {page.whenItMakesSense && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground">Quando isso faz sentido?</h3>
                <p className="mt-2 text-base leading-relaxed text-slate-700">{page.whenItMakesSense}</p>
              </div>
            )}
            {page.commonMistakes && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground">Erros comuns</h3>
                <p className="mt-2 text-base leading-relaxed text-slate-700">{page.commonMistakes}</p>
              </div>
            )}
            {page.example && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground">Exemplo prático</h3>
                <p className="mt-2 text-base leading-relaxed text-slate-700">{page.example}</p>
              </div>
            )}
            {page.checklist && page.checklist.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground">Checklist rápido</h3>
                <ul className="mt-3 list-inside list-disc space-y-1.5 text-base leading-relaxed text-slate-700">
                  {page.checklist.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Section 4 — Tool CTA */}
      <div className="bg-[#f8fafc]">
        <ToolEmbedSection page={page} />
      </div>

      {/* Section 4b — FAQ (todas as páginas; schema FAQPage) */}
      <FaqSection items={faqItems} pageUrl={`/${page.slug}`} baseUrl={BASE_URL} />

      {/* Por que confiar no DevFlow — autoridade interna */}
      <TrustSection
        toolHref={SEO_TOOL_TRUST[page.tool].href}
        toolLabel={SEO_TOOL_TRUST[page.tool].label}
      />

      {/* Section 5 — Páginas relacionadas (internal linking) */}
      <RelatedPagesGrid
        pages={relatedPages.map((p) => ({ slug: p.slug, h1: p.h1, description: p.description }))}
        title="Páginas relacionadas"
        subtitle="Guias e dicas do mesmo tema no ecossistema DevFlow Labs. Use os links com anchor text semântico para navegar."
      />

      {/* Section 6 — Final CTA */}
      <section
        className="relative overflow-hidden border-t border-border bg-[#f1f5f9] py-16 sm:py-20"
        aria-labelledby="seo-final-cta-heading"
      >
        <div
          className="pointer-events-none absolute -right-20 top-0 h-48 w-48 rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, transparent 70%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              "mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-10",
              "transition-shadow hover:shadow-md"
            )}
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
            <h2
              id="seo-final-cta-heading"
              className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              Explore o ecossistema DevFlow Labs
            </h2>
            <p className="mt-3 text-slate-600">
              Ferramentas gratuitas e produtos para automatizar e organizar sua operação.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/ferramentas"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold",
                  "bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                )}
              >
                Usar agora
              </Link>
              <Link
                href="/produtos"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3.5 text-base font-semibold",
                  "bg-white text-foreground transition-colors hover:bg-slate-50"
                )}
              >
                Começar agora
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
