import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import {
  authenticCaseSection,
  CASES_TRANSPARENCY_NOTE,
  nicheExamples,
  operationSteps,
  whyExamplesExist,
} from "@/lib/cases";
import {
  PRIMARY_CONVERT_CTA_LABEL,
  PRIMARY_DEMO_CTA_LABEL,
  PRIMARY_DEMO_HREF,
} from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;
const canonical = `${baseUrl}/cases`;

const ogTitle = "Cases e exemplos de operação WhatsApp | DevFlow Labs";
const ogDescription =
  "Veja exemplos de como a WhatsApp Platform da DevFlow Labs pode organizar atendimento, automação, handoff humano e métricas em diferentes nichos.";

export const metadata: Metadata = {
  title: ogTitle,
  description: ogDescription,
  alternates: { canonical },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: ogTitle,
    description: ogDescription,
    url: canonical,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — exemplos de operação WhatsApp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: ogTitle,
    description: ogDescription,
    images: [ogImage],
  },
};

const cardNiche = cn(
  "flex h-full flex-col rounded-2xl border df-border-dark bg-card",
  "shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)] transition-all duration-200",
  "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_22px_55px_-20px_rgba(15,23,42,0.22)]"
);

export default function CasesPage() {
  return (
    <main className="df-page">
      {/* Hero */}
      <section
        className="relative overflow-hidden border-b df-border-brand bg-gradient-to-br from-primary/[0.06] via-background to-background py-16 sm:py-20 lg:py-24"
        aria-labelledby="cases-hero-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40"
          aria-hidden
        >
          <div className="df-decor-radial-brand-soft absolute -top-24 right-0 h-72 w-72 rounded-full blur-3xl" />
        </div>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <p className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            Exemplos de operação
          </p>
          <h1
            id="cases-hero-heading"
            className="df-text-primary mt-5 max-w-4xl text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]"
          >
            Veja como a WhatsApp Platform se aplica em negócios reais
          </h1>
          <p className="df-text-secondary mt-5 max-w-3xl text-pretty text-lg leading-relaxed sm:text-xl">
            Modelos baseados em cenários comuns de atendimento no WhatsApp: mensagens perdidas, demora na
            resposta, falta de controle e ausência de métricas.
          </p>
          <p className="df-text-muted mt-6 max-w-3xl rounded-xl border border-border/80 bg-card/40 px-4 py-3 text-sm leading-relaxed backdrop-blur-sm sm:text-[0.9375rem]">
            {CASES_TRANSPARENCY_NOTE}
          </p>
          <div className="mt-10 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={PRIMARY_DEMO_HREF}
              className={cn(
                "df-btn-primary inline-flex h-12 min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold",
                "shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
            >
              {PRIMARY_DEMO_CTA_LABEL}
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
            <Link
              href="/contato"
              className={cn(
                "df-btn-secondary inline-flex h-12 min-h-11 flex-1 items-center justify-center rounded-xl px-6 text-sm font-semibold",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
            >
              {PRIMARY_CONVERT_CTA_LABEL}
            </Link>
          </div>
        </div>
      </section>

      {/* Por que existem */}
      <section className="border-b df-border-brand py-16 sm:py-20" aria-labelledby="why-cases-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="why-cases-heading"
            className="df-text-primary text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {whyExamplesExist.title}
          </h2>
          <p className="df-text-secondary mt-4 max-w-3xl text-base leading-relaxed sm:text-lg">
            {whyExamplesExist.body}
          </p>
          <ul className="mt-12 grid gap-5 sm:grid-cols-3" role="list">
            {whyExamplesExist.cards.map((c) => (
              <li
                key={c.title}
                className={cn(
                  "rounded-2xl border df-border-dark bg-card p-6",
                  "shadow-[0_12px_40px_-20px_rgba(0,0,0,0.25)]"
                )}
              >
                <h3 className="df-text-primary text-base font-bold">{c.title}</h3>
                <p className="df-text-secondary mt-2 text-sm leading-relaxed">{c.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Nichos */}
      <section className="py-16 sm:py-20" aria-labelledby="niche-examples-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="niche-examples-heading"
            className="df-text-primary text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Exemplos por nicho
          </h2>
          <p className="df-text-secondary mt-4 max-w-3xl text-base leading-relaxed">
            Cada bloco descreve um cenário comum e como a{" "}
            <strong className="font-semibold text-foreground">WhatsApp Platform</strong> pode ajudar na
            operação — sem prometer percentuais nem citar clientes fictícios.
          </p>

          <ul className="mt-12 grid gap-8 lg:grid-cols-2" role="list">
            {nicheExamples.map((n) => (
              <li key={n.slug} className={cn(cardNiche, "p-6 sm:p-8")}>
                <span className="inline-flex w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                  {n.badge}
                </span>
                <h3 className="df-text-primary mt-4 text-xl font-bold tracking-tight">{n.title}</h3>

                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary/90">Cenário</p>
                    <p className="df-text-secondary mt-1 text-sm leading-relaxed">{n.scenario}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary/90">
                      Como a plataforma atua
                    </p>
                    <ul className="mt-2 space-y-2" role="list">
                      {n.platformHelps.map((line) => (
                        <li key={line} className="df-text-secondary flex gap-2 text-sm leading-relaxed">
                          <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary/90">
                      Resultado esperado
                    </p>
                    <p className="df-text-secondary mt-1 text-sm leading-relaxed">{n.expectedOutcome}</p>
                  </div>
                </div>

                <div className="mt-8">
                  {n.featured ? (
                    <Link
                      href={n.ctaHref}
                      className={cn(
                        "df-btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold",
                        "shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                      )}
                    >
                      {n.ctaLabel}
                      <ArrowRight className="size-4 shrink-0" aria-hidden />
                    </Link>
                  ) : (
                    <Link
                      href={n.ctaHref}
                      className={cn(
                        "df-btn-secondary inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-sm font-semibold",
                        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                      )}
                    >
                      {n.ctaLabel}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Simulação → operação */}
      <section
        className="border-y df-border-brand bg-muted py-16 sm:py-20"
        aria-labelledby="simulation-steps-heading"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="simulation-steps-heading"
            className="df-text-primary text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Como transformamos simulação em operação real
          </h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3" role="list">
            {operationSteps.map((step, i) => (
              <li
                key={step.title}
                className="relative rounded-2xl border df-border-dark bg-card p-6 shadow-sm"
              >
                <span
                  className="mb-3 flex size-9 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <h3 className="df-text-primary font-bold">{step.title}</h3>
                <p className="df-text-secondary mt-2 text-sm leading-relaxed">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Case real */}
      <section className="py-16 sm:py-20" aria-labelledby="authentic-case-heading">
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
          <h2
            id="authentic-case-heading"
            className="df-text-primary text-center text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {authenticCaseSection.title}
          </h2>
          <p className="df-text-secondary mt-4 text-center text-base leading-relaxed">
            {authenticCaseSection.body}
          </p>
          <ul className="mt-8 space-y-3" role="list">
            {authenticCaseSection.bullets.map((b) => (
              <li
                key={b}
                className="df-text-secondary flex gap-3 rounded-xl border df-border-dark bg-card px-4 py-3 text-sm leading-relaxed"
              >
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                {b}
              </li>
            ))}
          </ul>
          <p className="df-text-muted mt-6 text-center text-xs leading-relaxed">
            Indicadores e narrativas públicas dependem de operação estável e autorização explícita do cliente.
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section
        className="border-t df-border-brand bg-background py-16 sm:py-20"
        aria-labelledby="cases-final-cta-heading"
      >
        <div className="mx-auto max-w-[720px] px-4 text-center sm:px-6 lg:px-8">
          <h2
            id="cases-final-cta-heading"
            className="df-text-primary text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Quer transformar seu WhatsApp em uma operação controlada?
          </h2>
          <p className="df-text-secondary mt-4 text-base leading-relaxed">
            Veja a demo guiada ou agende um diagnóstico para entender como o fluxo se aplicaria ao seu negócio.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={PRIMARY_DEMO_HREF}
              className={cn(
                "df-btn-primary inline-flex h-12 min-h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold sm:min-w-[12rem]",
                "shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
            >
              {PRIMARY_DEMO_CTA_LABEL}
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
            <Link
              href="/contato"
              className={cn(
                "df-btn-secondary inline-flex h-12 min-h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold sm:min-w-[12rem]",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
            >
              {PRIMARY_CONVERT_CTA_LABEL}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
