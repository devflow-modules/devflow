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

export const metadata: Metadata = {
  title: "WhatsApp Platform | DevFlow Labs",
  alternates: {
    canonical: `${baseUrl}/produtos/whatsapp-platform`,
  },
  description:
    "Plataforma premium de atendimento e vendas no WhatsApp com inbox multiatendente, automação inteligente, lead scoring e visão operacional para escalar com controle.",
  openGraph: {
    title: "WhatsApp Platform | Atendimento e Vendas com Escala",
    description:
      "Reposicione sua operação de WhatsApp com centralização, priorização de leads, automação e dashboard operacional em um único produto.",
    url: "https://devflowlabs.com.br/produtos/whatsapp-platform",
  },
  twitter: {
    title: "WhatsApp Platform | DevFlow Labs",
    description:
      "Atendimento, vendas e operação via WhatsApp com narrativa premium e foco em conversão.",
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
