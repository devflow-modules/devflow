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
    "Implantação acompanhada da operação de conversas no WhatsApp: inbox compartilhado, responsáveis, filas, histórico e automação supervisionada.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "WhatsApp Platform | Operação de conversas | DevFlow Labs",
    description:
      "Diagnóstico, desenho dos fluxos e implantação acompanhada. Inbox compartilhado, responsáveis, filas e handoff humano.",
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
      "Operação de conversas no WhatsApp com inbox compartilhado, responsáveis, filas e automação no repetitivo.",
    images: [ogImage],
  },
};

export default function WhatsAppPlatformPage() {
  return (
    <main className="df-page">
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <ProductPreviewSection />
      <DifferentiatorsSection />
      <UseCasesSection />
      <PositioningSection />
      <FinalCTASection />

      <div className="mx-auto max-w-[1200px] px-4 pb-8 sm:px-6 lg:px-8">
        <RelatedLinks variant="produtos" title="Explore soluções complementares" />
      </div>

      <div className="border-t df-border-brand py-8">
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
