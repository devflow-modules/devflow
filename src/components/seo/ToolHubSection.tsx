import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSeoPagesByTool } from "@/lib/seo/pages";
import { getGrowthPagesByTool } from "@/lib/seo/growth-pages";
import type { SeoTool } from "@/lib/seo/types";
import type { GrowthTool } from "@/lib/seo/growth-types";

const TOOL_CONFIG: Record<
  "divisao" | "cnpj" | "financeiro",
  { title: string; href: string; seo?: SeoTool; growth?: GrowthTool }
> = {
  divisao: {
    title: "Divisão de contas",
    href: "/ferramentas/divisao-de-contas",
    seo: "divisao",
  },
  cnpj: {
    title: "Consulta CNPJ",
    href: "/ferramentas/consulta-cnpj",
    seo: "cnpj",
  },
  financeiro: {
    title: "Financeiro",
    href: "/ferramentas/financeiro",
    growth: "financeiro",
  },
};

type Props = {
  tool: "divisao" | "cnpj" | "financeiro";
};

/**
 * Seção hub SEO: lista todas as páginas do cluster (SEO + growth) para a ferramenta.
 * Conteúdo original + links internos para melhor indexação.
 */
export function ToolHubSection({ tool }: Props) {
  const config = TOOL_CONFIG[tool];
  const seoPages = config.seo ? getSeoPagesByTool(config.seo) : [];
  const growthPages = config.growth ? getGrowthPagesByTool(config.growth) : [];

  const allLinks = [
    ...seoPages.map((p) => ({ slug: p.slug, title: p.h1 })),
    ...growthPages.map((p) => ({ slug: p.slug, title: p.h1 })),
  ].slice(0, 12);

  if (allLinks.length === 0) return null;

  return (
    <section
      className="border-t border-border bg-slate-50/80 py-12 sm:py-14"
      aria-labelledby="tool-hub-heading"
    >
      <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
        <h2
          id="tool-hub-heading"
          className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          Guias e páginas relacionadas
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
          Conteúdo original sobre este tema: como usar a ferramenta, dicas e comparativos.
          Cada link leva a um guia com foco em um caso de uso ou dúvida específica.
        </p>
        <ul className="mt-6 space-y-2" role="list">
          {allLinks.map(({ slug, title }) => (
            <li key={slug}>
              <Link
                href={`/${slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline sm:text-base"
              >
                {title}
                <ArrowRight className="size-4 shrink-0 opacity-70" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          <Link href="/ferramentas" className="font-medium text-primary hover:underline">
            Ver todas as ferramentas
          </Link>
        </p>
      </div>
    </section>
  );
}
