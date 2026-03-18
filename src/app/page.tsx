import type { Metadata } from "next";
import { ScrollTracker } from "@/components/shared/scroll-tracker";

// Novos componentes — posicionamento hub
import { HeroV2 } from "@/components/sections/hero-v2";
import { ToolsSection } from "@/components/sections/tools-section";
import { ProductsSection } from "@/components/sections/products-section";
import { ProblemSolutionSection } from "@/components/sections/problem-solution-section";
import { HowItWorksHub } from "@/components/sections/how-it-works-hub";
import { WhatsAppProductSection } from "@/components/sections/whatsapp-product-section";
import { FinalCtaV2 } from "@/components/sections/final-cta-v2";

// Seções existentes reaproveitadas
import { Metrics } from "@/components/sections/metrics";
import { ProofSocial } from "@/components/sections/proof-social";
import { Faq } from "@/components/sections/faq";

const baseUrl = "https://devflowlabs.com.br";

export const metadata: Metadata = {
  title: "DevFlow Labs | Plataforma de Ferramentas, Automação e SaaS",
  alternates: {
    canonical: baseUrl,
  },
  description:
    "Ferramentas online, controle financeiro pessoal e automação de atendimento no WhatsApp. DevFlow Labs — plataforma de ferramentas e produtos SaaS para automatizar, organizar e escalar sua operação.",
  keywords: [
    "ferramentas online",
    "controle financeiro pessoal",
    "divisão de contas",
    "consulta CNPJ",
    "automação whatsapp",
    "chatbot whatsapp",
    "software atendimento whatsapp",
    "IA para WhatsApp",
    "chatbot com handoff humano",
    "DevFlow Labs",
  ],
  openGraph: {
    title: "DevFlow Labs | Plataforma de Ferramentas, Automação e SaaS",
    description:
      "Ferramentas online, controle financeiro e automação de atendimento no WhatsApp. Produtos SaaS e soluções digitais integradas.",
    url: "https://devflowlabs.com.br",
  },
  twitter: {
    title: "DevFlow Labs | Plataforma de Ferramentas, Automação e SaaS",
    description:
      "Ferramentas online, controle financeiro e automação de atendimento no WhatsApp. Produtos SaaS e soluções digitais integradas.",
  },
};

export default function Home() {
  return (
    <>
      <ScrollTracker />

      {/* 1. Hero — plataforma hub */}
      <HeroV2 />

      {/* 2. Hub de ferramentas — prioridade máxima */}
      <ToolsSection />

      {/* 3. Nossos produtos */}
      <ProductsSection />

      {/* 4. Problema → Solução */}
      <ProblemSolutionSection />

      {/* 5. Como funciona */}
      <HowItWorksHub />

      {/* 6. WhatsApp Platform — reposicionado como "um dos produtos" */}
      <WhatsAppProductSection />

      {/* 7. Métricas — reaproveitado */}
      <Metrics />

      {/* 8. Prova social — reaproveitado */}
      <ProofSocial />

      {/* 9. FAQ — reaproveitado */}
      <Faq />

      {/* 10. CTA Final — novo */}
      <FinalCtaV2 />
    </>
  );
}
