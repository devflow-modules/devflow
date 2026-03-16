import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { ScrollTracker } from "@/components/shared/scroll-tracker";
import { ProblemList } from "@/components/sections/problem-list";
import { AntesDepois } from "@/components/sections/antes-depois";
import { ForWho } from "@/components/sections/for-who";
import { HowItWorks } from "@/components/sections/how-it-works";
import { AutomacaoFaz } from "@/components/sections/automacao-faz";
import { Processo3Passos } from "@/components/sections/processo-3-passos";
import { FeatureGrid } from "@/components/sections/feature-grid";
import { Metrics } from "@/components/sections/metrics";
import { ProjectsShowcase } from "@/components/sections/projects-showcase";
import { Architecture } from "@/components/sections/architecture";
import { IntegraHumano } from "@/components/sections/integra-humano";
import { TechStack } from "@/components/sections/tech-stack";
import { QuandoFazSentido } from "@/components/sections/quando-faz-sentido";
import { Faq } from "@/components/sections/faq";
import { ProofSocial } from "@/components/sections/proof-social";
import { FinalCta } from "@/components/sections/final-cta";

const baseUrl = "https://devflowlabs.com.br";

export const metadata: Metadata = {
  title: "DevFlow Labs | Automação de Atendimento no WhatsApp",
  alternates: {
    canonical: baseUrl,
  },
  description:
    "Automação de atendimento no WhatsApp, IA para WhatsApp, chatbot com handoff humano. Métricas, automação e operação real. DevFlow Labs — software engineering e digital products.",
  keywords: [
    "automação de atendimento no WhatsApp",
    "IA para WhatsApp",
    "chatbot com handoff humano",
    "automação de atendimento para empresas",
    "DevFlow Labs",
  ],
  openGraph: {
    title: "DevFlow Labs | Automação de Atendimento no WhatsApp",
    description:
      "Automação de atendimento no WhatsApp com métricas, handoff e controle real da operação. Produtos SaaS e soluções digitais.",
    url: "https://devflowlabs.com.br",
  },
  twitter: {
    title: "DevFlow Labs | Automação de Atendimento no WhatsApp",
    description:
      "Automação de atendimento no WhatsApp com métricas, handoff e controle real da operação. Produtos SaaS e soluções digitais.",
  },
};

export default function Home() {
  return (
    <>
      <ScrollTracker />
      <Hero />
      <ProblemList />
      <AntesDepois />
      <ForWho />
      <HowItWorks />
      <AutomacaoFaz />
      <Processo3Passos />
      <FeatureGrid />
      <Metrics />
      <ProjectsShowcase />
      <Architecture />
      <IntegraHumano />
      <TechStack />
      <QuandoFazSentido />
      <Faq />
      <ProofSocial />
      <FinalCta />
    </>
  );
}
