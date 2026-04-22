import type { Metadata } from "next";
import { ScrollTracker } from "@/components/shared/scroll-tracker";

// Novos componentes — posicionamento hub
import { HeroV2 } from "@/components/sections/hero-v2";
import { TechnicalTrustStrip } from "@/components/sections/technical-trust-strip";
import { HubPillarsSection } from "@/components/sections/hub-pillars-section";
import { WhereToStartSection } from "@/components/sections/where-to-start-section";
import { ToolsSection } from "@/components/sections/tools-section";
import { ProductsSection } from "@/components/sections/products-section";
import { ProblemSolutionSection } from "@/components/sections/problem-solution-section";
import { HowItWorksHub } from "@/components/sections/how-it-works-hub";
import { ResultsSocialProofSection } from "@/components/sections/results-social-proof-section";
import { WhatsAppProductSection } from "@/components/sections/whatsapp-product-section";
import { AuthorityRealOpsSection } from "@/components/sections/authority-real-ops-section";
import { FinalCtaV2 } from "@/components/sections/final-cta-v2";

// Seções existentes reaproveitadas
import { Metrics } from "@/components/sections/metrics";
import { ProofSocial } from "@/components/sections/proof-social";
import { Faq } from "@/components/sections/faq";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

export const metadata: Metadata = {
  title: "DevFlow Labs | WhatsApp Platform — Inbox, automação e operação",
  alternates: {
    canonical: baseUrl,
  },
  description:
    "WhatsApp Platform para atendimento e vendas com inbox, automação e métricas. Ferramentas gratuitas e produtos SaaS DevFlow Labs — organize a operação sem perder o humano.",
  keywords: [
    "WhatsApp Platform",
    "inbox whatsapp",
    "automação whatsapp",
    "atendimento whatsapp",
    "ferramentas online",
    "controle financeiro pessoal",
    "DevFlow Labs",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "DevFlow Labs | WhatsApp Platform e automação de atendimento",
    description:
      "Inbox, automação e visão operacional no WhatsApp — com ferramentas e SaaS integrados na mesma plataforma.",
    url: baseUrl,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — WhatsApp Platform, inbox e automação",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DevFlow Labs | WhatsApp Platform",
    description:
      "Organize atendimento e vendas no WhatsApp com inbox, automação e métricas — e ferramentas quando precisar.",
    images: [ogImage],
  },
};

/** Secundárias: menos padding vertical para não competir com o herói e o bloco WhatsApp. */
function HomeSecondaryStack({ children }: { children: React.ReactNode }) {
  return (
    <div className="[&>section]:!py-8 sm:[&>section]:!py-10 lg:[&>section]:!py-14">{children}</div>
  );
}

export default function Home() {
  return (
    <>
      <ScrollTracker />

      <HeroV2 />

      <TechnicalTrustStrip />

      <WhatsAppProductSection />

      <AuthorityRealOpsSection />

      <HomeSecondaryStack>
        <HubPillarsSection />

        <WhereToStartSection />

        <ToolsSection />

        <ProductsSection />

        <ProblemSolutionSection />

        <HowItWorksHub />

        <ResultsSocialProofSection />

        <Metrics />

        <ProofSocial />

        <Faq />
      </HomeSecondaryStack>

      <FinalCtaV2 />
    </>
  );
}
