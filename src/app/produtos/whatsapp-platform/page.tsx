import type { Metadata } from "next";
import Link from "next/link";
import {
  HeroSection,
  ProblemSection,
  SolutionSection,
  ProductPreviewSection,
  DifferentiatorsSection,
  UseCasesSection,
  PositioningSection,
  FinalCTASection,
} from "@/components/sections/whatsapp";
import { RelatedLinks } from "@/components/shared/related-links";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

export const metadata: Metadata = {
  title: "WhatsApp Platform | DevFlow Labs",
  alternates: {
    canonical: `${baseUrl}/produtos/whatsapp-platform`,
  },
  description:
    "Plataforma premium de atendimento e vendas no WhatsApp com inbox multiatendente, automação inteligente, lead scoring e visão operacional para escalar com controle.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "WhatsApp Platform | Atendimento e Vendas com Escala",
    description:
      "Reposicione sua operação de WhatsApp com centralização, priorização de leads, automação e dashboard operacional em um único produto.",
    url: `${baseUrl}/produtos/whatsapp-platform`,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — WhatsApp Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Platform | DevFlow Labs",
    description:
      "Atendimento, vendas e operação via WhatsApp com narrativa premium e foco em conversão.",
    images: [ogImage],
  },
};

export default function WhatsAppPlatformPage() {
  return (
    <main>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <ProductPreviewSection />
      <DifferentiatorsSection />
      <UseCasesSection />
      <PositioningSection />
      <FinalCTASection />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-8">
        <RelatedLinks variant="produtos" title="Explore o ecossistema" />
      </div>

      <div className="border-t border-border py-8">
        <p className="text-center">
          <Link
            href="/"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            ← Voltar ao Início
          </Link>
        </p>
      </div>
    </main>
  );
}
