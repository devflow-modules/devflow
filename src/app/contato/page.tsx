import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, MessageCircle, PlayCircle } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

export const metadata: Metadata = {
  title: "Fale com a DevFlow Labs",
  description:
    "Demo guiada da WhatsApp Platform, conversa no WhatsApp ou e-mail para briefing — escolha o canal que combina com o seu ritmo de decisão.",
  alternates: {
    canonical: `${baseUrl}/contato`,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "Fale com a DevFlow Labs | Demo, WhatsApp ou e-mail",
    description:
      "Veja a plataforma em ação na demo, fale com o time no WhatsApp ou envie um briefing formal por e-mail.",
    url: `${baseUrl}/contato`,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — contato e demo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fale com a DevFlow Labs",
    description:
      "Demo guiada, WhatsApp ou e-mail — contato alinhado ao funil da WhatsApp Platform.",
    images: [ogImage],
  },
};

const cardBase =
  "flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.2)] sm:p-8";

export default function ContatoPage() {
  return (
    <main className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        aria-hidden
      >
        <div
          className="absolute -top-40 right-0 h-96 w-96 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(34, 197, 94, 0.22) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute -bottom-32 left-0 h-80 w-80 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(15, 23, 42, 0.12) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Contato comercial
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
            Fale com a DevFlow Labs
          </h1>
          <p className="df-text-secondary mx-auto mt-4 max-w-2xl text-base font-semibold leading-snug sm:text-lg">
            Escolha o melhor caminho para ver a plataforma em ação ou conversar sobre o seu caso.
          </p>
        </header>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
          <article className={cn(cardBase, "ring-1 ring-emerald-500/15")}>
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PlayCircle className="size-6" aria-hidden />
            </div>
            <h2 className="mt-5 text-lg font-bold tracking-tight text-foreground">
              Ver demo guiada
            </h2>
            <p className="df-text-secondary mt-2 flex-1 text-sm leading-relaxed">
              Dois minutos vendo fila, priorização e handoff — ideal para validar fit antes de falar com alguém.
            </p>
            <Link
              href="/demo"
              className={cn(
                "mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-primary-foreground",
                "bg-primary shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)] transition-all hover:brightness-[1.03] active:brightness-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2"
              )}
            >
              Abrir demo
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
          </article>

          <article className={cn(cardBase, "border-slate-200/90")}>
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#25D366]/12 text-[#128C7E]">
              <MessageCircle className="size-6" aria-hidden />
            </div>
            <h2 className="mt-5 text-lg font-bold tracking-tight text-foreground">
              WhatsApp
            </h2>
            <p className="df-text-secondary mt-2 flex-1 text-sm leading-relaxed">
              Canal principal em horário comercial: resposta em minutos para dúvidas, escopo e próximos passos.
            </p>
            <div className="mt-8">
              <WhatsAppCta
                label="Falar no WhatsApp"
                size="lg"
                className="w-full justify-center"
                text="Olá, vim pelo site da DevFlow. Quero alinhar sobre a WhatsApp Platform e o meu caso de atendimento."
              />
            </div>
          </article>

          <article className={cn(cardBase, "border-slate-200/90")}>
            <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900/5 text-slate-700">
              <Mail className="size-6" aria-hidden />
            </div>
            <h2 className="mt-5 text-lg font-bold tracking-tight text-foreground">
              E-mail
            </h2>
            <p className="df-text-secondary mt-2 flex-1 text-sm leading-relaxed">
              Para propostas formais, anexos ou compras que exigem documentação por escrito.
            </p>
            <a
              href="mailto:contato@devflowlabs.com.br"
              className={cn(
                "mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-800",
                "shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              contato@devflowlabs.com.br
            </a>
          </article>
        </div>

        <div
          className="df-section-dark mx-auto mt-12 max-w-3xl rounded-2xl border bg-card px-5 py-6 transition-all duration-200 hover:shadow-md sm:px-8 df-border-dark"
          aria-label="Como escolher o canal"
        >
          <p className="df-text-muted text-center text-xs font-bold uppercase tracking-[0.18em]">
            Decisão rápida
          </p>
          <ul className="df-text-secondary mt-4 space-y-3 text-sm leading-relaxed sm:text-[0.9375rem]">
            <li>
              <span className="df-text-primary font-semibold">Quer ver antes de falar?</span>{" "}
              Vá para a <Link href="/demo" className="font-semibold text-primary underline-offset-4 hover:underline">demo</Link>.
            </li>
            <li>
              <span className="df-text-primary font-semibold">Quer discutir o seu caso?</span>{" "}
              WhatsApp — conversa direta com o time.
            </li>
            <li>
              <span className="df-text-primary font-semibold">Precisa de proposta formal?</span>{" "}
              E-mail com contexto e anexos.
            </li>
          </ul>
        </div>

        <p className="df-text-secondary mx-auto mt-10 max-w-xl text-center text-xs font-medium leading-relaxed sm:text-sm">
          WhatsApp costuma responder em minutos em dias úteis. E-mail: até 24h úteis para retorno com leitura completa do briefing.
        </p>

        <p className="mt-12 text-center">
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
