// TODO: move to packages/niche-pages — re-export from shared package when workspace package exists

import Link from "next/link";
import { ArrowRight, Check, ChevronDown, MessageCircle } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import type { DemoMessage, NicheAutomationPageConfig } from "@/lib/niche-whatsapp-automation-pages";
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
      className="df-section-light bg-[#f1f5f9] py-20 sm:py-24"
      aria-labelledby="niche-chat-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <h2
          id="niche-chat-heading"
          className="df-text-primary text-center text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ color: "#0f172a" }}
        >
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">{intro}</p>
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
            Ver demo guiada
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
        className="df-section-light relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50 py-20 sm:py-24 lg:py-28"
        aria-labelledby="niche-hero-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-50"
          aria-hidden
        >
          <div
            className="absolute -top-24 right-0 h-72 w-72 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(34, 197, 94, 0.16) 0%, transparent 70%)",
            }}
          />
        </div>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90">
              WhatsApp Platform · automação com handoff
            </p>
            <h1
              id="niche-hero-heading"
              className="df-text-primary mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl lg:text-[3.15rem] lg:leading-[1.08]"
              style={{ color: "#0f172a" }}
            >
              {content.hero.h1}
            </h1>
            <p className="mt-5 text-pretty text-lg leading-relaxed text-slate-600 sm:text-xl">
              {content.hero.subheadline}
            </p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/demo"
                className={cn(
                  "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-primary-foreground",
                  "bg-primary shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)] transition-all hover:brightness-[1.03] sm:min-w-[11rem]"
                )}
              >
                Ver demo
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </Link>
              <WhatsAppCta
                label={content.heroWhatsApp.label}
                size="lg"
                text={content.heroWhatsApp.prefill}
                className="w-full justify-center sm:w-auto sm:min-w-[14rem]"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        className="df-section-light border-t border-border bg-[#f1f5f9] py-20 sm:py-24"
        aria-labelledby="niche-pains-heading"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="niche-pains-heading"
            className="df-text-primary text-center text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: "#0f172a" }}
          >
            {content.problems.sectionTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">{content.problems.intro}</p>
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
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.description}</p>
              </article>
            ))}
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
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">{content.howItWorks.intro}</p>
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
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
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
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">{content.benefits.intro}</p>
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2">
            {content.benefits.items.map((b) => (
              <article
                key={b.title}
                className="flex gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <h3 className="font-semibold text-foreground">{b.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{b.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="df-section-light border-t border-border bg-[#f1f5f9] py-20 sm:py-24"
        aria-labelledby="niche-results-heading"
      >
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
          <h2
            id="niche-results-heading"
            className="df-text-primary text-center text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: "#0f172a" }}
          >
            {content.results.sectionTitle}
          </h2>
          <p className="mx-auto mt-3 text-center text-slate-600">{content.results.intro}</p>
          <ul className="mt-10 space-y-4" role="list">
            {content.results.items.map((line) => (
              <li
                key={line}
                className="flex gap-3 rounded-xl border border-border bg-card p-4 text-left text-sm leading-relaxed text-slate-700 shadow-sm"
              >
                <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="df-section-light border-t border-border bg-slate-50/90 py-20 sm:py-24"
        aria-labelledby="niche-faq-heading"
      >
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
          <h2
            id="niche-faq-heading"
            className="df-text-primary text-center text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: "#0f172a" }}
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
                      className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
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
            <p className="mt-4 text-slate-600">{content.finalCta.subtitle}</p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/demo"
                className={cn(
                  "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-primary-foreground",
                  "bg-primary shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)] transition-all hover:brightness-[1.03] sm:min-w-[11rem]"
                )}
              >
                Ver demo
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </Link>
              <WhatsAppCta
                label={content.finalCta.whatsappLabel}
                size="lg"
                text={content.finalCta.whatsappPrefill}
                className="w-full justify-center sm:w-auto sm:min-w-[14rem]"
              />
            </div>
            <p className="mt-8">
              <Link
                href="/automacao-whatsapp"
                className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-foreground hover:underline"
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
