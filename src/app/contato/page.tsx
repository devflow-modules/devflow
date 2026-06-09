import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, MessageCircle } from "lucide-react";
import { DiagnosticoForm } from "@/components/contato/diagnostico-form";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import {
  CONTACT_ANALYSIS_ITEMS,
  CONTACT_DIAGNOSTIC_WHATSAPP_TEXT,
  PRIMARY_DEMO_CTA_LABEL,
  QUICK_WHATSAPP_CTA_LABEL,
} from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

const contactDescription =
  "Solicite um diagnóstico da sua operação de atendimento e vendas no WhatsApp. Mapeamos gargalos, automações possíveis, handoff humano, SLA e dashboard operacional.";

export const metadata: Metadata = {
  title: "Agendar Diagnóstico WhatsApp | DevFlow Labs",
  description: contactDescription,
  alternates: {
    canonical: `${baseUrl}/contato`,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "Agendar Diagnóstico WhatsApp | DevFlow Labs",
    description: contactDescription,
    url: `${baseUrl}/contato`,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — agendar diagnóstico da operação no WhatsApp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agendar Diagnóstico WhatsApp | DevFlow Labs",
    description: contactDescription,
    images: [ogImage],
  },
};

const sidebarCard =
  "rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.12)] sm:p-8";

export default function ContatoPage() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-40" aria-hidden>
        <div className="df-decor-radial-brand-soft absolute -top-40 right-0 h-96 w-96 rounded-full blur-3xl" />
        <div className="df-decor-radial-ink-soft absolute -bottom-32 left-0 h-80 w-80 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Diagnóstico da operação WhatsApp
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
            Agende um diagnóstico da sua operação no WhatsApp
          </h1>
          <p className="df-text-secondary mx-auto mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
            Entenda onde sua operação perde mensagens, tempo e vendas — e veja como organizar atendimento com IA,
            humano e dashboard.
          </p>
        </header>

        <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-[1fr_minmax(17rem,20rem)] lg:items-start">
          <DiagnosticoForm />

          <aside className="space-y-6" aria-labelledby="analise-heading">
            <div className={sidebarCard}>
              <h2 id="analise-heading" className="df-text-primary text-lg font-bold tracking-tight">
                O que vamos analisar
              </h2>
              <ul className="mt-4 space-y-3" role="list">
                {CONTACT_ANALYSIS_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span className="df-text-secondary text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={cn(sidebarCard, "border-primary/20 bg-primary/[0.03]")}>
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#25D366]/12 text-[#128C7E]">
                <MessageCircle className="size-5" aria-hidden />
              </div>
              <h3 className="df-text-primary mt-4 text-base font-bold">Prefere ir direto ao WhatsApp?</h3>
              <p className="df-text-secondary mt-2 text-sm leading-relaxed">
                Envie a mensagem inicial e nossa equipe retoma o diagnóstico com você em minutos, em horário comercial.
              </p>
              <div className="mt-5">
                <WhatsAppCta
                  label={QUICK_WHATSAPP_CTA_LABEL}
                  ariaLabel="Falar no WhatsApp para agendar diagnóstico da operação"
                  variant="secondary"
                  size="lg"
                  className="w-full justify-center"
                  text={CONTACT_DIAGNOSTIC_WHATSAPP_TEXT}
                  trackingSource="contato_sidebar_whatsapp"
                  trackFunnel
                />
              </div>
            </div>

            <div className={sidebarCard}>
              <p className="df-text-secondary text-sm leading-relaxed">
                Quer ver a plataforma antes? A{" "}
                <Link href="/demo" className="font-semibold text-primary underline-offset-2 hover:underline">
                  {PRIMARY_DEMO_CTA_LABEL}
                </Link>{" "}
                mostra fila, handoff e dashboard em poucos minutos.
              </p>
              <Link
                href="/demo"
                className={cn(
                  "mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold",
                  "transition-colors hover:border-primary/35 hover:bg-muted/30"
                )}
              >
                {PRIMARY_DEMO_CTA_LABEL}
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </Link>
            </div>
          </aside>
        </div>

        <p className="df-text-secondary mx-auto mt-10 max-w-xl text-center text-xs font-medium leading-relaxed sm:text-sm">
          Diagnóstico consultivo focado em atendimento e vendas no WhatsApp — IA no repetitivo, handoff humano, SLA e
          dashboard operacional.
        </p>

        <p className="mt-10 text-center">
          <Link
            href="/"
            className="df-text-secondary text-sm font-semibold underline-offset-4 hover:text-foreground hover:underline"
          >
            ← Voltar ao início
          </Link>
        </p>
      </div>
    </main>
  );
}
