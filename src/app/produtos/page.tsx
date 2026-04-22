import type { Metadata } from "next";
import { CtaBlock } from "@/components/sections/cta-block";
import { RelatedLinks } from "@/components/shared/related-links";
import { ProductsHubClient } from "@/components/products/products-hub-client";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

export const metadata: Metadata = {
  title: "Produtos | DevFlow Labs — WhatsApp Platform e Financeiro",
  description:
    "Catálogo DevFlow: WhatsApp Platform e Financeiro. Escolha pelo problema — cada produto com próximo passo claro.",
  keywords: ["DevFlow Labs", "produtos", "plataforma", "SaaS", "automação"],
  alternates: {
    canonical: `${baseUrl}/produtos`,
  },
  openGraph: {
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "Produtos DevFlow | Plataforma",
    description:
      "Organize, automatize e escala: hub de produtos com posicionamento claro e CTAs diretos.",
    url: `${baseUrl}/produtos`,
    type: "website",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — catálogo de produtos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Produtos | DevFlow Labs",
    description: "WhatsApp Platform, Financeiro e próximos passos claros no hub de produtos.",
    images: [ogImage],
  },
};

export default function ProdutosPage() {
  return (
    <div className="min-h-screen">
      <ProductsHubClient />

      <CtaBlock
        title="Quer resolver algo na hora, de graça?"
        subtitle="Ferramentas são entradas rápidas; produtos são sistemas completos — os dois se conectam."
        primaryLabel="Ver demo"
        primaryHref="/demo"
        secondaryLink={{ label: "Abrir ferramentas", href: "/ferramentas" }}
      />

      <div className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6 lg:px-8">
        <RelatedLinks variant="produtos" title="Explore o ecossistema" />
      </div>
    </div>
  );
}
