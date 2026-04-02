import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { ProductPageBackLink } from "@/components/products/product-page-back-link";
import { DemoMicroStory } from "@/components/demo/DemoMicroStory";
import { demoEyebrowClass } from "@/components/demo/demoUi";
import { cn } from "@/lib/utils";
import { InvestigaProdutoDemo } from "./InvestigaProdutoDemo";

const baseUrl = "https://devflowlabs.com.br";

export const metadata: Metadata = {
  title: "Investiga+ | Inteligência em CNPJ e empresas | DevFlow Labs",
  description:
    "Problema: dados de empresa espalhados. Solução: ficha clara em segundos + histórico no produto. Demo ilustrativa, consulta Receita grátis e próximo passo comercial.",
  keywords: [
    "CNPJ",
    "consulta empresa",
    "Investiga+",
    "demo",
    "DevFlow Labs",
    "inteligência comercial",
  ],
  alternates: {
    canonical: `${baseUrl}/produtos/investigamais`,
  },
  openGraph: {
    title: "Investiga+ | Do CNPJ à decisão",
    description:
      "Demo em 30s: problema → como funciona → resultado → consulta grátis ou produto completo.",
    url: `${baseUrl}/produtos/investigamais`,
    type: "website",
  },
  twitter: {
    title: "Investiga+ | DevFlow Labs",
    description:
      "Demo guiada: resultado visível, histórico no produto, consulta pública grátis.",
  },
};

export default function InvestigaMaisProdutoPage() {
  return (
    <main>
      <section
        className="border-b border-border bg-gradient-to-b from-muted/30 to-background py-10 sm:py-14"
        aria-labelledby="investiga-hero-heading"
      >
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ProductPageBackLink className="mb-2" />
          <div className={cn(demoEyebrowClass, "mt-6")}>
            <Search className="size-3.5 text-primary" aria-hidden />
            Produto · Inteligência em CNPJ
          </div>
          <h1
            id="investiga-hero-heading"
            className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Investiga+
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Transforme consulta de empresa em argumento de venda: primeiro a ficha que o cliente
            entende, depois o histórico e a profundidade que fecham contrato.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-14" aria-label="Demonstração do produto">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <DemoMicroStory variant="investigamais" className="mb-8 sm:mb-10" />
          <InvestigaProdutoDemo />
        </div>
      </section>

      <div className="border-t border-border py-10">
        <p className="text-center">
          <Link
            href="/"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            ← Voltar ao início
          </Link>
        </p>
      </div>
    </main>
  );
}
