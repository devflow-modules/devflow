import type { Metadata } from "next";
import { ScrollTracker } from "@/components/shared/scroll-tracker";

// Seções da home — WhatsApp Platform em primeiro plano
import { HeroV2 } from "@/components/sections/hero-v2";
import { TechnicalTrustStrip } from "@/components/sections/technical-trust-strip";
import { ProblemSolutionSection } from "@/components/sections/problem-solution-section";
import { WhatsAppProductSection } from "@/components/sections/whatsapp-product-section";
import { AuthorityRealOpsSection } from "@/components/sections/authority-real-ops-section";
import { HowItWorksHub } from "@/components/sections/how-it-works-hub";
import { ResultsSocialProofSection } from "@/components/sections/results-social-proof-section";
import { FinalCtaV2 } from "@/components/sections/final-cta-v2";

// Ecossistema secundário — abaixo da oferta principal
import { HubPillarsSection } from "@/components/sections/hub-pillars-section";
import { WhereToStartSection } from "@/components/sections/where-to-start-section";
import { ToolsSection } from "@/components/sections/tools-section";
import { ProductsSection } from "@/components/sections/products-section";

// Seções existentes reaproveitadas
import { Metrics } from "@/components/sections/metrics";
import { ProofSocial } from "@/components/sections/proof-social";
import { Faq } from "@/components/sections/faq";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

const homeTitle = "DevFlow Labs | Automação WhatsApp com IA, Inbox e Handoff Humano";
const homeDescription =
  "Transforme seu WhatsApp em uma operação previsível de atendimento e vendas com IA no repetitivo, inbox multiatendente, handoff humano, SLA e dashboard operacional.";

export const metadata: Metadata = {
  title: homeTitle,
  alternates: {
    canonical: baseUrl,
  },
  description: homeDescription,
  keywords: [
    "automação WhatsApp",
    "WhatsApp com IA",
    "inbox WhatsApp",
    "atendimento WhatsApp",
    "vendas pelo WhatsApp",
    "WhatsApp Cloud API",
    "chatbot WhatsApp",
    "handoff humano",
    "SLA atendimento",
    "dashboard atendimento",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: homeTitle,
    description: homeDescription,
    url: baseUrl,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — automação WhatsApp com IA, inbox e handoff humano",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
    images: [ogImage],
  },
};

/** Ecossistema complementar — visualmente mais discreto que a oferta principal. */
function HomeEcosystemStack({ children }: { children: React.ReactNode }) {
  return (
    <div className="[&>section]:!py-8 sm:[&>section]:!py-10 lg:[&>section]:!py-12 [&>section]:opacity-[0.98]">
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <ScrollTracker />

      <HeroV2 />

      <TechnicalTrustStrip />

      <ProblemSolutionSection />

      <WhatsAppProductSection />

      <AuthorityRealOpsSection />

      <HowItWorksHub />

      <ResultsSocialProofSection />

      <Metrics />

      <ProofSocial />

      <Faq />

      <HomeEcosystemStack>
        <ToolsSection />

        <ProductsSection />

        <HubPillarsSection />

        <WhereToStartSection />
      </HomeEcosystemStack>

      <FinalCtaV2 />
    </>
  );
}
