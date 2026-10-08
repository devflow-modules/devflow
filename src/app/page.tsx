import type { Metadata } from "next";
import { ScrollTracker } from "@/components/shared/scroll-tracker";

// Seções da home — WhatsApp Platform em primeiro plano
import { HeroV2 } from "@/components/sections/hero-v2";
import { TechnicalTrustStrip } from "@/components/sections/technical-trust-strip";
import { ProblemSolutionSection } from "@/components/sections/problem-solution-section";
import { ProductStories } from "@/components/sections/product-stories";
import { HowItWorksHub } from "@/components/sections/how-it-works-hub";
import { WhatsAppProductSection } from "@/components/sections/whatsapp-product-section";
import { Faq } from "@/components/sections/faq";
import { FinalCtaV2 } from "@/components/sections/final-cta-v2";

// Ecossistema secundário — só depois da decisão de conversão
import { ToolsSection } from "@/components/sections/tools-section";
import { ProductsSection } from "@/components/sections/products-section";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

const homeTitle = "DevFlow Labs | Automação WhatsApp com IA, Inbox e Handoff Humano";
const homeDescription =
  "Transforme seu WhatsApp em uma operação de atendimento e vendas com inbox compartilhada, responsáveis, filas e handoff humano.";

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
    "fila de atendimento",
    "inbox compartilhada",
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

      <main className="df-brand-v2">
      <HeroV2 />

      <TechnicalTrustStrip />

      <ProblemSolutionSection />

      <ProductStories />

      <HowItWorksHub />

      <WhatsAppProductSection />

      <Faq />

      <FinalCtaV2 />

      <HomeEcosystemStack>
        <ToolsSection />

        <ProductsSection />
      </HomeEcosystemStack>
      </main>
    </>
  );
}
