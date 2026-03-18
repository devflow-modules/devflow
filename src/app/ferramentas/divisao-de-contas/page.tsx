import type { Metadata } from "next";
import Link from "next/link";
import { GrowthTrackVisitor } from "@/components/analytics/GrowthTrackVisitor";
import { Section } from "@/components/layout/Section";
import { RelatedLinks } from "@/components/shared/related-links";
import { DividirContasTool } from "@/modules/financeiro/components/DividirContasTool";

const baseUrl = "https://devflowlabs.com.br";

export const metadata: Metadata = {
  title: "Divisão de Contas — Rateio Proporcional por Renda",
  description:
    "Calcule a divisão de contas para casal, república ou família. Rateio proporcional por renda. Ferramenta gratuita.",
  alternates: {
    canonical: `${baseUrl}/ferramentas/divisao-de-contas`,
  },
  keywords: [
    "divisão de contas",
    "dividir contas casal",
    "rateio proporcional",
    "dividir contas república",
    "divisão de despesas",
  ],
  openGraph: {
    title: "Divisão de Contas | DevFlow Labs",
    description:
      "Calcule o rateio de contas proporcional por renda. Casal, república ou família.",
    url: `${baseUrl}/ferramentas/divisao-de-contas`,
    type: "website",
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Divisão de Contas",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description: "Calcule o rateio de contas proporcional por renda.",
  url: `${baseUrl}/ferramentas/divisao-de-contas`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
};

export default function DivisaoDeContasPage() {
  return (
    <div className="min-h-screen">
      <GrowthTrackVisitor />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

      <Section aria-label="Hero">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Divisão de contas
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Calcule o rateio proporcional por renda. Para casal, república ou
            família.
          </p>
          <Link
            href="/ferramentas"
            className="mt-6 inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            ← Voltar ao hub de ferramentas
          </Link>
        </div>
      </Section>

      <Section alternate aria-labelledby="calculadora">
        <h2
          id="calculadora"
          className="sr-only"
        >
          Calculadora de divisão proporcional
        </h2>
        <DividirContasTool />
      </Section>

      <Section aria-labelledby="relacionado">
        <RelatedLinks variant="ferramentas" title="Explore o ecossistema" />
      </Section>
    </div>
  );
}
