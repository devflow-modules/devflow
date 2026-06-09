// TODO: move to packages/niche-pages — re-export from shared package when workspace package exists

import Link from "next/link";
import { ArrowRight, Check, ChevronDown, MessageCircle } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import type { DemoMessage, NicheAutomationPageConfig } from "@/lib/niche-whatsapp-automation-pages";
import {
  NICHE_QUERO_NO_MEU_NEGOCIO_CTA_LABEL,
  NICHE_RESOLVER_NEGOCIO_CTA_LABEL,
  NICHE_VER_FLUXO_COMPLETO_CTA_LABEL,
  NICHE_VER_NA_PRATICA_CTA_LABEL,
  PRIMARY_CONVERT_CTA_LABEL,
  PRIMARY_DEMO_CTA_LABEL,
  PRIMARY_DEMO_HREF,
  QUICK_WHATSAPP_CTA_LABEL,
} from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

function MessageBubble({
  type,
  text,
  time,
}: {
  type: "user" | "bot";
  text: string;
  time: string;
}) {
  return (
    <div
      className={cn(
        "flex max-w-[90%] flex-col gap-0.5",
        type === "user" ? "self-end items-end" : "self-start items-start"
      )}
    >
      <div
        className={cn(
          "rounded-2xl px-3 py-2 text-sm leading-snug",
          type === "user"
            ? "rounded-tr-md bg-muted text-foreground"
            : "rounded-tl-md border border-border bg-card text-foreground"
        )}
      >
        {text}
      </div>
      <span className="text-[10px] text-muted-foreground">{time}</span>
    </div>
  );
}

function ChatExample({
  title,
  intro,
  messages,
}: {
  title: string;
  intro: string;
  messages: readonly DemoMessage[];
}) {
  return (
    <section
      className="df-section-light bg-muted/50 py-20 sm:py-24"
      aria-labelledby="niche-chat-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <h2
          id="niche-chat-heading"
          className="df-text-primary text-center text-2xl font-bold tracking-tight sm:text-3xl"
        >
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center df-text-secondary">{intro}</p>
        <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
              <MessageCircle className="size-5 text-primary" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Atendimento DevFlow</p>
              <p className="text-xs font-medium text-primary">online</p>
            </div>
          </div>
          <div className="flex flex-col space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            {messages.map((msg, i) => (
              <MessageBubble key={i} type={msg.type} text={msg.text} time={msg.time} />
            ))}
          </div>
        </div>
        <p className="mt-8 text-center">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            {NICHE_VER_FLUXO_COMPLETO_CTA_LABEL}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </p>
      </div>
    </section>
  );
}

export function NicheAutomationWhatsAppPage({ content }: { content: NicheAutomationPageConfig }) {
  return (
    <main>
      <section
        className="df-section-light relative overflow-hidden bg-gradient-to-b from-card via-card to-muted/40 py-20 sm:py-24 lg:py-28"
        aria-labelledby="niche-hero-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-50"
          aria-hidden
        >
          <div className="df-decor-radial-brand-soft absolute -top-24 right-0 h-72 w-72 rounded-full blur-3xl" />
        </div>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90">
              WhatsApp Platform · automação com handoff
            </p>
            <h1
              id="niche-hero-heading"
              className="df-text-primary mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl lg:text-[3.15rem] lg:leading-[1.08]"
            >
              {content.hero.h1}
            </h1>
            <p className="mt-5 text-pretty text-lg leading-relaxed df-text-secondary sm:text-xl">
              {content.hero.subheadline}
            </p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/demo"
                className={cn(
                  "df-btn-primary df-shadow-cta inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold sm:min-w-[11rem]"
                )}
              >
                {NICHE_VER_NA_PRATICA_CTA_LABEL}
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </Link>
              <WhatsAppCta
                label={QUICK_WHATSAPP_CTA_LABEL}
                variant="secondary"
                size="lg"
                text={content.heroWhatsApp.prefill}
                className="w-full justify-center sm:w-auto sm:min-w-[14rem]"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        className="df-section-light border-t border-border bg-muted/50 py-20 sm:py-24"
        aria-labelledby="niche-pains-heading"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="niche-pains-heading"
            className="df-text-primary text-center text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {content.problems.sectionTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center df-text-secondary">{content.problems.intro}</p>
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {content.problems.items.map((p) => (
              <article
                key={p.title}
                className={cn(
                  "rounded-2xl border border-border bg-card p-5 shadow-sm",
                  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                )}
              >
                <h3 className="df-text-primary font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed df-text-secondary">{p.description}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <WhatsAppCta
              label={NICHE_RESOLVER_NEGOCIO_CTA_LABEL}
              size="lg"
              text={`Olá, vim da página ${content.path}. Quero resolver isso no meu negócio.`}
              className="w-full max-w-md justify-center"
            />
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24" aria-labelledby="niche-how-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="niche-how-heading"
            className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            {content.howItWorks.sectionTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center df-text-secondary">{content.howItWorks.intro}</p>
          <ol className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
            {content.howItWorks.steps.map((step, index) => (
              <li
                key={step.title}
                className="relative rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <span
                  className="mb-3 flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <h3 className="font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed df-text-secondary">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ChatExample
        title={content.exampleChat.sectionTitle}
        intro={content.exampleChat.intro}
        messages={content.exampleChat.messages}
      />

      <section className="py-20 sm:py-24" aria-labelledby="niche-benefits-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="niche-benefits-heading"
            className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            {content.benefits.sectionTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center df-text-secondary">{content.benefits.intro}</p>
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2">
            {content.benefits.items.map((b) => (
              <article
                key={b.title}
                className="flex gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <h3 className="font-semibold text-foreground">{b.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed df-text-secondary">{b.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="df-section-light border-t border-border bg-muted/50 py-20 sm:py-24"
        aria-labelledby="niche-results-heading"
      >
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
          <h2
            id="niche-results-heading"
            className="df-text-primary text-center text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {content.results.sectionTitle}
          </h2>
          <p className="mx-auto mt-3 text-center df-text-secondary">{content.results.intro}</p>
          <ul className="mt-10 space-y-4" role="list">
            {content.results.items.map((line) => (
              <li
                key={line}
                className="flex gap-3 rounded-xl border border-border bg-card p-4 text-left text-sm leading-relaxed df-text-secondary shadow-sm"
              >
                <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex justify-center">
            <WhatsAppCta
              label={NICHE_QUERO_NO_MEU_NEGOCIO_CTA_LABEL}
              size="lg"
              text={`Olá, vim da página ${content.path}. Quero esse resultado no meu negócio.`}
              className="w-full max-w-md justify-center"
            />
          </div>
        </div>
      </section>

      <section
        className="df-section-light border-t border-border bg-muted/55 py-20 sm:py-24"
        aria-labelledby="niche-faq-heading"
      >
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
          <h2
            id="niche-faq-heading"
            className="df-text-primary text-center text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Perguntas frequentes
          </h2>
          <div className="mt-10 space-y-3">
            {content.faq.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
              >
                <summary className="cursor-pointer list-none font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    {item.question}
                    <ChevronDown
                      className="size-4 shrink-0 df-text-muted transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed df-text-secondary">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24" aria-labelledby="niche-final-cta-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-[0_24px_70px_-28px_rgba(15,23,42,0.18)] sm:p-12">
            <h2
              id="niche-final-cta-heading"
              className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              {content.finalCta.title}
            </h2>
            <p className="mt-4 df-text-secondary">{content.finalCta.subtitle}</p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href={PRIMARY_DEMO_HREF}
                className={cn(
                  "df-btn-primary df-shadow-cta inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold sm:min-w-[11rem]"
                )}
              >
                {PRIMARY_DEMO_CTA_LABEL}
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </Link>
              <Link
                href="/contato"
                className={cn(
                  "df-btn-secondary inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold",
                  "w-full sm:w-auto sm:min-w-[14rem]"
                )}
              >
                {PRIMARY_CONVERT_CTA_LABEL}
              </Link>
            </div>
            <p className="mt-8">
              <Link
                href="/automacao-whatsapp"
                className="text-sm font-medium df-text-secondary underline-offset-4 hover:text-foreground hover:underline"
              >
                ← Ver automação WhatsApp e outros segmentos
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
