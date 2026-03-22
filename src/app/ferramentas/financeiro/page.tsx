import type { Metadata } from "next";
import Link from "next/link";
import { GrowthTrackVisitor } from "@/components/analytics/GrowthTrackVisitor";
import { Section } from "@/components/layout/Section";
import { RelatedLinks } from "@/components/shared/related-links";
import { CrossSellBeyond } from "@/components/sections/cross-sell-beyond";
import { ToolHubSection } from "@/components/seo/ToolHubSection";
import { SimuladorRapidoFinanceiro } from "@/modules/financeiro/components/SimuladorRapidoFinanceiro";
import { LeadCaptureForm } from "@/modules/financeiro/components/LeadCaptureForm";
import { FinanceiroTools } from "@/modules/financeiro/components/FinanceiroTools";

const baseUrl = "https://devflowlabs.com.br";

export const metadata: Metadata = {
  title: "Controle Financeiro Pessoal Online",
  description:
    "Organize suas despesas mensais e controle seu dinheiro com nossa ferramenta gratuita de planejamento financeiro. Receitas, despesas e fluxo do mês.",
  alternates: {
    canonical: `${baseUrl}/ferramentas/financeiro`,
  },
  keywords: [
    "controle financeiro pessoal",
    "organizar despesas",
    "planejamento financeiro",
    "fluxo de caixa pessoal",
    "receitas e despesas",
    "divisão de contas",
    "projeção financeira",
  ],
  openGraph: {
    title: "Controle Financeiro Pessoal Online | DevFlow Labs",
    description:
      "Organize suas despesas mensais e controle seu dinheiro com nossa ferramenta gratuita de planejamento financeiro.",
    url: `${baseUrl}/ferramentas/financeiro`,
    type: "website",
  },
};

const FAQ = [
  {
    q: "Preciso cadastrar cartão?",
    a: "Não. O uso é grátis e não pedimos cartão.",
  },
  {
    q: "É realmente grátis?",
    a: "Sim. Você pode usar as ferramentas sem pagar nada.",
  },
  {
    q: "Posso usar no celular?",
    a: "Sim. O site funciona no navegador do celular e do computador. Não precisa instalar app.",
  },
];

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Controle Financeiro Pessoal",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Ferramenta gratuita para organizar receitas, despesas e planejar o mês.",
  url: `${baseUrl}/ferramentas/financeiro`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
};

export default function FinanceiroPage() {
  return (
    <div className="min-h-screen">
      <GrowthTrackVisitor />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

      <Section aria-label="Simulador" className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <SimuladorRapidoFinanceiro />
        </div>
      </Section>

      <Section aria-labelledby="lead-capture">
        <div className="mx-auto max-w-2xl">
          <LeadCaptureForm
            source="simulator"
            title="Receba novas ferramentas financeiras e melhorias"
            buttonLabel="Quero receber"
          />
        </div>
      </Section>

      <Section alternate aria-label="Hero">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Controle Financeiro Pessoal
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Organize receitas, despesas e planeje o mês. Ferramentas gratuitas
            para quem quer clareza sobre o dinheiro sem planilhas que quebram.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/ferramentas/financeiro/auth"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Entrar ou criar conta
            </Link>
            <Link
              href="/planilha-vs-app-financeiro"
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              Planilha vs aplicativo financeiro
            </Link>
            <Link
              href="/ferramentas"
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              ← Voltar ao hub
            </Link>
          </div>
        </div>
      </Section>

      <Section alternate aria-labelledby="ferramentas">
        <h2
          id="ferramentas"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Ferramentas
        </h2>
        <p className="mt-2 text-muted-foreground">
          Use as calculadoras abaixo. Não precisa cadastrar.
        </p>
        <FinanceiroTools />
      </Section>

      <Section aria-labelledby="relacionado">
        <h2
          id="relacionado"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Ferramentas relacionadas
        </h2>
        <p className="mt-2 text-muted-foreground">
          <Link
            href="/ferramentas/divisao-de-contas"
            className="font-medium text-primary hover:underline"
          >
            Divisão de contas
          </Link>{" "}
          — rateio proporcional por renda para casal, república ou família.
        </p>
        <Link
          href="/ferramentas"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Ver todas as ferramentas
        </Link>
      </Section>

      <Section aria-labelledby="faq">
        <h2
          id="faq"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Perguntas frequentes
        </h2>
        <dl className="mt-6 space-y-4">
          {FAQ.map((item) => (
            <div
              key={item.q}
              className="rounded-lg border border-border bg-card p-4"
            >
              <dt className="font-medium text-foreground">{item.q}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{item.a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section alternate aria-labelledby="early-access">
        <div className="mx-auto max-w-xl">
          <LeadCaptureForm
            source="early_access"
            title="Estamos lançando novos recursos do Financeiro DevFlow"
            description="Entre na lista de acesso antecipado"
            buttonLabel="Quero participar"
            variant="footer"
          />
        </div>
      </Section>

      <ToolHubSection tool="financeiro" />

      <Section aria-label="Quer ir além — automação e produtos">
        <div className="mx-auto max-w-4xl">
          <CrossSellBeyond variant="financeiro-page" />
        </div>
      </Section>

      <Section>
        <RelatedLinks variant="financeiro" title="Explore o ecossistema" />
      </Section>
    </div>
  );
}
