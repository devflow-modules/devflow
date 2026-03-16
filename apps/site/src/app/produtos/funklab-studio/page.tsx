import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, Music2, Sparkles, Download, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

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

export const metadata: Metadata = {
  title: "FunkLab Studio | DevFlow Labs",
  description:
    "Ferramenta de produção musical assistida. Gere sketches, basslines e grooves em segundos. Software para produtores.",
  openGraph: {
    title: "FunkLab Studio | Produção musical assistida",
    description:
      "Gere sketches musicais, basslines MIDI e grooves em segundos. Produto da DevFlow Labs.",
    url: "https://devflowlabs.com.br/produtos/funklab-studio",
  },
  twitter: {
    title: "FunkLab Studio",
    description:
      "Produção musical assistida. Sketches, basslines e grooves em segundos.",
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
            <div className="mb-6 inline-flex items-center justify-center rounded-full border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground">
              <Music2 className="mr-2 size-4" aria-hidden />
              Produção assistida
            </div>
            <h1
              id="product-hero-heading"
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              FunkLab Studio
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Gere sketches musicais, basslines e grooves em segundos. Ferramenta
              profissional para produtores.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <a
                href={FUNKLAB_DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-12 rounded-2xl border border-transparent",
                  "bg-foreground px-5 text-base font-medium text-background",
                  "transition-colors hover:bg-foreground/90"
                )}
              >
                <Sparkles className="size-4" aria-hidden />
                Abrir demo
              </a>
              <Link
                href="/projetos"
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-12 rounded-2xl border border-border px-5 text-base font-medium",
                  "bg-background text-foreground transition-colors hover:bg-muted"
                )}
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
              <a
                href={FUNKLAB_DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent",
                  "bg-foreground px-6 py-3 text-base font-medium text-background",
                  "transition-colors hover:bg-foreground/90"
                )}
              >
                <Sparkles className="size-4" aria-hidden />
                Abrir demo
              </a>
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
