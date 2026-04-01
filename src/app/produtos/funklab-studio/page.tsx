import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, Music2, Sparkles, Download, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { demoCtaPrimaryClass, demoCtaSecondaryClass, demoEyebrowClass } from "@/components/demo/demoUi";
import { FunklabDemoCta } from "./FunklabDemoCta";
import { FunklabDemoSection } from "./FunklabDemoSection";

const heroBullets = [
  "Sketches musicais em segundos",
  "Basslines MIDI prontas para usar",
  "Biblioteca de grooves e padrões",
];

const features = [
  {
    title: "Sketch Generator",
    description:
      "Gere múltiplas ideias de uma vez. Varia grooves e basslines automaticamente por estilo e BPM.",
  },
  {
    title: "Bassline Generator",
    description:
      "Linhas de baixo MIDI com padrões da biblioteca. Root, escala, duração e BPM configuráveis.",
  },
  {
    title: "Biblioteca integrada",
    description:
      "Presets, grooves e bass patterns prontos. Mandelão, funk, phonk, tech house e mais.",
  },
  {
    title: "Exportação direta",
    description:
      "Baixe os arquivos gerados — MIDI, áudio e projetos — para usar na sua DAW.",
  },
  {
    title: "Engine musical",
    description:
      "Análise de áudio, humanização de timing e velocity, slides e ghost notes.",
  },
  {
    title: "Produto em evolução",
    description:
      "Demo pública. Pronto para apresentação, portfólio e evolução comercial.",
  },
];

const howItWorksSteps = [
  {
    icon: Music2,
    title: "Escolha o estilo",
    description:
      "Mandelão, funk 130, phonk, funk tech house. Cada preset com grooves e bass patterns próprios.",
  },
  {
    icon: Sparkles,
    title: "Gere os sketches",
    description:
      "Configure BPM e quantidade. O engine gera variações de grooves e basslines em poucos segundos.",
  },
  {
    icon: Download,
    title: "Baixe e produza",
    description:
      "Arquivos MIDI e áudio prontos para abrir na sua DAW e continuar a produção.",
  },
];

const FUNKLAB_DEMO_URL =
  process.env.NEXT_PUBLIC_FUNKLAB_DEMO_URL || "https://funklab-studio.vercel.app";

const baseUrl = "https://devflowlabs.com.br";

export const metadata: Metadata = {
  title: "FunkLab Studio | DevFlow Labs",
  description:
    "Menos tela em branco na DAW: sketches e grooves MIDI em segundos. Demo guiada, cenário claro e export padronizado — alinhado ao ecossistema DevFlow.",
  keywords: ["FunkLab", "MIDI", "produção musical", "demo", "DevFlow Labs", "groove"],
  alternates: {
    canonical: `${baseUrl}/produtos/funklab-studio`,
  },
  openGraph: {
    title: "FunkLab Studio | Sketches MIDI em segundos",
    description:
      "Demo em 30s: preset + BPM → arquivos .mid prontos. Próximo passo: abrir a demo ao vivo.",
    url: `${baseUrl}/produtos/funklab-studio`,
  },
  twitter: {
    title: "FunkLab Studio",
    description:
      "Grooves e basslines MIDI rápidos — demo guiada e mesmo padrão visual das outras soluções DevFlow.",
  },
};

export default function FunkLabStudioPage() {
  return (
    <main>
      {/* 1. Hero do produto */}
      <section
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="product-hero-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className={cn(demoEyebrowClass, "mb-6")}>
              <Music2 className="size-3.5 text-primary" aria-hidden />
              Produto · Produção assistida
            </div>
            <h1
              id="product-hero-heading"
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              FunkLab Studio
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:mx-auto sm:text-lg">
              Acelere o primeiro loop: o engine sugere grooves e basslines para você refinar na
              DAW — com export MIDI padronizado.
            </p>
            <div className="mt-8 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:mx-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4">
              <FunklabDemoCta
                href={FUNKLAB_DEMO_URL}
                surface="hero"
                className={cn(demoCtaPrimaryClass, "px-6 text-base")}
              >
                <Sparkles className="size-4" aria-hidden />
                Abrir demo
              </FunklabDemoCta>
              <Link
                href="/projetos"
                className={cn(demoCtaSecondaryClass, "px-6 text-base")}
              >
                Ver outros projetos
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ul className="mt-8 space-y-2 text-left sm:mx-auto sm:max-w-md" role="list">
              {heroBullets.map((bullet, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <FunklabDemoSection />

      {/* 2. O que o FunkLab entrega */}
      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="features-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="features-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            O que o FunkLab entrega
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Recursos para acelerar o início da produção e explorar ideias.
          </p>
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className={cn(
                  "rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-border/80 hover:bg-muted/20"
                )}
              >
                <h3 className="font-medium text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Como funciona */}
      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="how-it-works-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="how-it-works-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Como funciona
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Três passos: estilo, geração e download.
          </p>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
            {howItWorksSteps.map((step, index) => (
              <article
                key={step.title}
                className={cn(
                  "rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-border/80 hover:bg-muted/20"
                )}
              >
                <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-muted/50">
                  <step.icon className="size-5 text-foreground" aria-hidden />
                </div>
                <p className="mt-4 text-xs font-medium text-muted-foreground">
                  Passo {index + 1}
                </p>
                <h3 className="mt-1 font-medium text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CTA final */}
      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="cta-final-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              "mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12"
            )}
          >
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-muted/50">
              <Layers className="size-6 text-foreground" aria-hidden />
            </div>
            <h2
              id="cta-final-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Experimente o FunkLab Studio
            </h2>
            <p className="mt-4 text-muted-foreground">
              Demo pública. Gere sketches e basslines em segundos, sem cadastro.
            </p>
            <div className="mt-8">
              <FunklabDemoCta
                href={FUNKLAB_DEMO_URL}
                surface="cta_final"
                className={cn(demoCtaPrimaryClass, "px-8 text-base")}
              >
                <Sparkles className="size-4" aria-hidden />
                Abrir demo
              </FunklabDemoCta>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-border py-8">
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
