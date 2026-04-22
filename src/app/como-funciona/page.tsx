import type { Metadata } from "next";
import Link from "next/link";
import { HowItWorksHub } from "@/components/sections/how-it-works-hub";

const baseUrl = "https://devflowlabs.com.br";

export const metadata: Metadata = {
  title: "Como funciona",
  description:
    "Três passos para usar ferramentas gratuitas e produtos SaaS da DevFlow Labs — sem instalar, direto no navegador.",
  alternates: {
    canonical: `${baseUrl}/como-funciona`,
  },
};

export default function ComoFuncionaPage() {
  return (
    <main>
      <div className="border-b border-border bg-muted/40 py-8 sm:py-10">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/" className="font-medium text-primary hover:underline">
              Home
            </Link>
            <span className="mx-1.5 text-slate-400" aria-hidden>
              /
            </span>
            <span className="font-medium text-foreground">Como funciona</span>
          </nav>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Como a DevFlow Labs funciona
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            Veja em três passos como organizar seu atendimento e automatizar seu WhatsApp.
          </p>
        </div>
      </div>
      <HowItWorksHub />
    </main>
  );
}
