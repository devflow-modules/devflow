import type { Metadata } from "next";
import { ToolsHubHero } from "@/components/sections/tools-hub-hero";
import { ToolCard } from "@/components/sections/tool-card";
import { WhyUseSection } from "@/components/sections/why-use-section";
import { ConnectedProductsSection } from "@/components/sections/connected-products-section";
import { CtaBlock } from "@/components/sections/cta-block";
import { RelatedLinks } from "@/components/shared/related-links";
import { CrossSellBeyond } from "@/components/sections/cross-sell-beyond";
import { Wallet, SplitSquareHorizontal, Building2, Sparkles } from "lucide-react";

const baseUrl = "https://devflowlabs.com.br";

const TOOLS = [
  {
    slug: "financeiro",
    icon: Wallet,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    badge: "Mais usado",
    badgeColor: "bg-primary/10 text-primary border border-primary/30",
    title: "Financeiro",
    description: "Controle completo PF, PJ e sociedade. Receitas, despesas, orçamentos e fechamento mensal.",
    cta: "Testar grátis",
    href: "/ferramentas/financeiro",
    highlight: true,
  },
  {
    slug: "divisao-de-contas",
    icon: SplitSquareHorizontal,
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
    title: "Divisão de contas",
    description: "Divida despesas entre pessoas de forma simples e rápida. Sem cadastro.",
    cta: "Usar agora",
    href: "/ferramentas/divisao-de-contas",
    highlight: false,
  },
  {
    slug: "consulta-cnpj",
    icon: Building2,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    title: "Consulta CNPJ",
    description: "Dados de empresas na base da Receita Federal em segundos.",
    cta: "Usar agora",
    href: "/ferramentas/consulta-cnpj",
    highlight: false,
  },
  {
    slug: "em-breve",
    icon: Sparkles,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-400",
    badge: "Em breve",
    badgeColor: "bg-slate-100 text-slate-500",
    title: "Próximas ferramentas",
    description: "Novas ferramentas em desenvolvimento. Acompanhe os lançamentos.",
    cta: "",
    href: "#",
    highlight: false,
    disabled: true,
  },
];

export const metadata: Metadata = {
  title: "Ferramentas | DevFlow Labs — Hub de ferramentas e automação",
  description:
    "Ferramentas para automatizar, organizar e escalar sua operação. Financeiro, divisão de contas, consulta CNPJ. Conecte com os produtos DevFlow Labs.",
  alternates: {
    canonical: `${baseUrl}/ferramentas`,
  },
  openGraph: {
    title: "Ferramentas | DevFlow Labs",
    description:
      "Hub de ferramentas: controle financeiro, divisão de contas, consulta CNPJ. Conectado ao ecossistema DevFlow Labs.",
    url: `${baseUrl}/ferramentas`,
    type: "website",
  },
};

export default function FerramentasPage() {
  return (
    <div className="min-h-screen">
      <ToolsHubHero />

      {/* Grid principal */}
      <section
        id="ferramentas-grid"
        className="py-24 bg-white"
        aria-labelledby="grid-heading"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2 id="grid-heading" className="sr-only">
            Ferramentas disponíveis
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((tool) => (
              <ToolCard
                key={tool.slug}
                icon={tool.icon}
                iconBg={tool.iconBg}
                iconColor={tool.iconColor}
                badge={tool.badge}
                badgeColor={tool.badgeColor}
                title={tool.title}
                description={tool.description}
                cta={tool.cta}
                href={tool.href}
                highlight={tool.highlight}
                disabled={tool.disabled}
              />
            ))}
          </div>
        </div>
      </section>

      <WhyUseSection />
      <ConnectedProductsSection />

      <CtaBlock
        title="Próximo passo: conheça nossos produtos"
        subtitle="Sistemas e automações que se conectam às ferramentas."
        primaryLabel="Começar agora"
        primaryHref="/produtos"
      />

      <div className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6 lg:px-8">
        <CrossSellBeyond className="mb-12" />
        <RelatedLinks
          variant="ferramentas"
          title="Explore o ecossistema"
        />
      </div>
    </div>
  );
}
