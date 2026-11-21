"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { trackFunnelCtaClick } from "@/lib/analytics";
import {
  COMO_FUNCIONA_HREF,
  HOME_CONVERT_CTA_LABEL,
  HOME_DEMO_CTA_LABEL,
  PRIMARY_CONVERT_HREF,
  PRIMARY_DEMO_HREF,
  VER_COMO_FUNCIONA_CTA_LABEL,
} from "@/lib/conversion-copy";
import {
  HOW_IT_WORKS_ILLUSTRATIVE_EXAMPLE,
  HOW_IT_WORKS_STEPS,
} from "@/lib/how-it-works-steps";

export type HowItWorksHubVariant = "summary" | "detailed";

type HowItWorksHubProps = {
  /** `summary` on Home (short steps + link to page); `detailed` on `/como-funciona`. */
  variant?: HowItWorksHubVariant;
};

export function HowItWorksHub({ variant = "summary" }: HowItWorksHubProps) {
  const isDetailed = variant === "detailed";

  return (
    <section
      id="como-funciona-hub"
      className="df-v2-section bg-[var(--df-v2-surface)]"
      aria-labelledby="how-it-works-hub-heading"
    >
      <div className="df-v2-container">
        <h2 id="how-it-works-hub-heading" className="df-v2-h2 max-w-[18ch] text-balance">
          {isDetailed
            ? "Quatro etapas até a operação no WhatsApp"
            : "Como a solução entra na sua operação"}
        </h2>
        <p className="df-v2-lead mt-4 max-w-2xl">
          {isDetailed
            ? "Do diagnóstico à operação acompanhada: o que acontece em cada etapa, o que você valida e o que consegue conferir ao final."
            : "Diagnóstico, desenho dos fluxos, implementação e acompanhamento — em quatro etapas. Detalhes na página Como funciona."}
        </p>

        {isDetailed ? (
          <aside
            className="mt-8 rounded-[16px] border border-[var(--df-v2-border)] bg-[var(--df-v2-surface-muted)] p-5 sm:p-6"
            aria-label={HOW_IT_WORKS_ILLUSTRATIVE_EXAMPLE.label}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--df-v2-muted)]">
              {HOW_IT_WORKS_ILLUSTRATIVE_EXAMPLE.label}
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--df-v2-ink)]">
              {HOW_IT_WORKS_ILLUSTRATIVE_EXAMPLE.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--df-v2-ink-soft)]">
              {HOW_IT_WORKS_ILLUSTRATIVE_EXAMPLE.body}
            </p>
          </aside>
        ) : null}

        <ol
          className={
            isDetailed
              ? "mt-10 grid list-none gap-6 sm:gap-8"
              : "df-v2-timeline mt-12 list-none border-t border-[var(--df-v2-border)]"
          }
          aria-label="Etapas do processo consultivo da WhatsApp Platform"
        >
          {HOW_IT_WORKS_STEPS.map((step) =>
            isDetailed ? (
              <li
                key={step.title}
                className="rounded-[16px] border border-[var(--df-v2-border)] bg-[var(--df-v2-surface)] p-5 sm:p-6"
              >
                <p className="text-sm font-semibold text-[var(--df-v2-brand)]">{step.number}</p>
                <h3 className="df-v2-h3 mt-2">{step.title}</h3>
                <dl className="mt-4 grid gap-4 text-sm leading-relaxed sm:grid-cols-3">
                  <div>
                    <dt className="font-semibold text-[var(--df-v2-ink)]">O que acontece</dt>
                    <dd className="mt-1 text-[var(--df-v2-ink-soft)]">{step.happens}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--df-v2-ink)]">O que você faz</dt>
                    <dd className="mt-1 text-[var(--df-v2-ink-soft)]">{step.clientRole}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--df-v2-ink)]">O que você confere</dt>
                    <dd className="mt-1 text-[var(--df-v2-ink-soft)]">{step.outcome}</dd>
                  </div>
                </dl>
              </li>
            ) : (
              <li
                key={step.title}
                className="border-b border-[var(--df-v2-border)] py-6 lg:border-b-0 lg:border-r lg:px-5 lg:py-8 lg:last:border-r-0"
              >
                <p className="text-sm font-semibold text-[var(--df-v2-brand)]">{step.number}</p>
                <h3 className="df-v2-h3 mt-3">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--df-v2-ink-soft)]">{step.summary}</p>
              </li>
            ),
          )}
        </ol>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {isDetailed ? (
            <>
              <Link
                href={PRIMARY_DEMO_HREF}
                aria-label="Ver demonstração guiada de atendimento no WhatsApp"
                onClick={() =>
                  trackFunnelCtaClick({ cta: "ver_demo_guiada", surface: "how_it_works_demo" })
                }
                className="df-btn-primary min-h-12 px-5 text-sm font-semibold"
              >
                {HOME_DEMO_CTA_LABEL}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href={PRIMARY_CONVERT_HREF}
                aria-label="Solicitar diagnóstico da operação no WhatsApp"
                onClick={() =>
                  trackFunnelCtaClick({ cta: "agendar_diagnostico", surface: "how_it_works_primary" })
                }
                className="df-btn-secondary min-h-12 px-5 text-sm font-semibold"
              >
                {HOME_CONVERT_CTA_LABEL}
              </Link>
            </>
          ) : (
            <>
              <Link
                href={COMO_FUNCIONA_HREF}
                aria-label="Ver como funciona a implantação da plataforma de WhatsApp"
                onClick={() =>
                  trackFunnelCtaClick({ cta: "ver_como_funciona", surface: "how_it_works_detail" })
                }
                className="df-btn-primary min-h-12 px-5 text-sm font-semibold"
              >
                {VER_COMO_FUNCIONA_CTA_LABEL}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href={PRIMARY_DEMO_HREF}
                aria-label="Ver demonstração guiada de atendimento no WhatsApp"
                onClick={() =>
                  trackFunnelCtaClick({ cta: "ver_demo_guiada", surface: "how_it_works_demo" })
                }
                className="df-btn-secondary min-h-12 px-5 text-sm font-semibold"
              >
                {HOME_DEMO_CTA_LABEL}
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
