import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { ProblemList } from "@/components/sections/problem-list";
import { ForWho } from "@/components/sections/for-who";
import { HowItWorks } from "@/components/sections/how-it-works";
import { FeatureGrid } from "@/components/sections/feature-grid";
import { Metrics } from "@/components/sections/metrics";
import { ProjectsShowcase } from "@/components/sections/projects-showcase";
import { Architecture } from "@/components/sections/architecture";
import { FinalCta } from "@/components/sections/final-cta";

export const metadata: Metadata = {
  title: "DevFlow Labs | Automação de Atendimento no WhatsApp",
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
      <Hero />
      <ProblemList />
      <ForWho />
      <HowItWorks />
      <FeatureGrid />
      <Metrics />
      <ProjectsShowcase />
      <Architecture />
      <FinalCta />
    </>
  );
}
