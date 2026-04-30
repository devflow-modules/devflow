import type { Metadata } from "next";
import Link from "next/link";
import { HowItWorksHub } from "@/components/sections/how-it-works-hub";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

export const metadata: Metadata = {
  title: "Como funciona",
  description:
    "Três passos para usar ferramentas gratuitas e produtos SaaS da DevFlow Labs — sem instalar, direto no navegador.",
  alternates: {
    canonical: `${baseUrl}/como-funciona`,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "Como funciona | DevFlow Labs",
    description:
      "Fluxo em três passos: ferramentas gratuitas, produtos SaaS e próximo passo claro — demo e WhatsApp Platform.",
    url: `${baseUrl}/como-funciona`,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — como funciona",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Como funciona | DevFlow Labs",
    description: "Entenda o fluxo DevFlow em poucos passos, do navegador à operação no WhatsApp.",
    images: [ogImage],
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
            <span className="mx-1.5 df-text-muted" aria-hidden>
              /
            </span>
            <span className="font-medium text-foreground">Como funciona</span>
          </nav>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Como a DevFlow Labs funciona
          </h1>
          <p className="mt-3 max-w-2xl text-base df-text-secondary">
            Veja em três passos como organizar seu atendimento e automatizar seu WhatsApp.
          </p>
        </div>
      </div>
      <HowItWorksHub />

      <section
        className="border-t border-border bg-muted/30 py-12 sm:py-16"
        aria-labelledby="como-funciona-cta-heading"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="como-funciona-cta-heading" className="text-xl font-semibold text-foreground sm:text-2xl">
              Próximo passo
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Veja o fluxo de atendimento na prática ou abra a página do produto para posicionamento completo.
            </p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/demo"
                className={cn(
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold sm:text-base",
                  "bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                )}
              >
                Ver demo
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/produtos/whatsapp-platform"
                className={cn(
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold transition-colors hover:bg-muted sm:text-base"
                )}
              >
                WhatsApp Platform
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              <Link href="/precos" className="font-medium text-primary underline-offset-4 hover:underline">
                Preços
              </Link>
              <span className="mx-2 text-border" aria-hidden>
                ·
              </span>
              <Link href="/produtos" className="font-medium text-primary underline-offset-4 hover:underline">
                Catálogo de produtos
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
