import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

export const metadata: Metadata = {
  title: "Sobre a DevFlow Labs",
  description:
    "Engenharia de produto na intersecção de CRM, prospecção, WhatsApp e demo — sistemas para gerar lead, operar conversa e fechar com controle.",
  alternates: {
    canonical: `${baseUrl}/sobre`,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "Sobre a DevFlow Labs | Produto, operação e WhatsApp",
    description:
      "Construímos software onde geração de lead, CRM, follow-up, automação no WhatsApp e venda demo-driven trabalham no mesmo loop.",
    url: `${baseUrl}/sobre`,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — sobre",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sobre a DevFlow Labs",
    description:
      "Sistemas que conectam prospecção, CRM, follow-up e WhatsApp Platform — foco atual em atendimento com escala.",
    images: [ogImage],
  },
};

const sectionTitle = "mt-14 text-xl font-bold tracking-tight text-foreground sm:text-2xl";
const body = "mt-4 space-y-4 text-sm leading-relaxed df-text-secondary sm:text-[0.9375rem]";

export default function SobrePage() {
  return (
    <main className="relative overflow-hidden py-16 sm:py-20 lg:py-24">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="df-decor-radial-brand-soft absolute -top-24 right-0 h-72 w-72 rounded-full opacity-50 blur-2xl" />
      </div>

      <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90">
          Posicionamento
        </p>
        <h1
          id="sobre-heading"
          className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Sobre a DevFlow Labs
        </h1>
        <p className="mt-4 text-base font-semibold leading-snug df-text-primary sm:text-lg">
          Software de produto para quem trata WhatsApp como canal de receita — não como brinde de marketing.
        </p>

        <section aria-labelledby="sobre-quem">
          <h2 id="sobre-quem" className={sectionTitle}>
            Quem é a DevFlow Labs
          </h2>
          <div className={body}>
            <p>
              Somos um time enxuto de engenharia e produto, baseado no Brasil, focado em sistemas que sobrevivem à operação real:
              fila, handoff, prioridade comercial e métricas que importam para quem responde cliente.
            </p>
            <p>
              Não vendemos “site institucional” nem escopo genérico: entregamos plataformas e ferramentas que você usa no dia a dia para responder mais rápido e com menos caos.
            </p>
          </div>
        </section>

        <section aria-labelledby="sobre-oque">
          <h2 id="sobre-oque" className={sectionTitle}>
            O que construímos
          </h2>
          <div className={body}>
            <p>
              Hoje o foco público é a{" "}
              <strong className="font-semibold text-foreground">WhatsApp Platform</strong>
              : inbox multiatendente, automação com controle humano e narrativa alinhada a venda e suporte em escala.
            </p>
            <p>
              Em paralelo mantemos o{" "}
              <strong className="font-semibold text-foreground">Financeiro Casa</strong>
              {" "}no ecossistema — produto ativo para fluxo de caixa e clareza financeira, com a mesma barra de UX e engenharia.
            </p>
            <p>
              Por baixo dos produtos há um fio comum:{" "}
              <strong className="font-semibold text-foreground">
                geração de lead, CRM interno, follow-up, automação no WhatsApp e demo como prova de valor
              </strong>
              . É o loop que a própria DevFlow usa para crescer.
            </p>
          </div>
        </section>

        <section aria-labelledby="sobre-como">
          <h2 id="sobre-como" className={sectionTitle}>
            Como pensamos produto e operação
          </h2>
          <div className={body}>
            <p>
              Começamos pelo gargalo: onde a conversa morre, onde o comercial perde contexto, onde a automação vira risco em vez de alavanca.
            </p>
            <p>
              Projetamos para handoff explícito, fila visível e decisões comerciais — IA entra onde acelera, nunca onde esconde risco de marca ou de receita.
            </p>
            <p>
              Linguagem, ritmo de demo e onboarding seguem a mesma regra: menos slide, mais sistema em uso.
            </p>
          </div>
        </section>

        <div className="mt-14 df-surface-elevated rounded-2xl p-6 shadow-[0_20px_60px_-28px_rgba(0,0,0,0.32)] sm:p-8">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] df-status-brand">
            Próximo passo
          </p>
          <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/demo"
              className={cn(
                "df-btn-primary df-shadow-cta inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--devflow-brand)_50%,transparent)] focus-visible:ring-offset-2"
              )}
            >
              Ver demo
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
            <WhatsAppCta
              label="Falar no WhatsApp"
              size="lg"
              className="w-full justify-center sm:flex-1 sm:min-w-[12rem]"
              text="Olá, li a página Sobre da DevFlow e quero alinhar expectativas sobre a WhatsApp Platform."
            />
          </div>
        </div>

        <p className="mt-12">
          <Link
            href="/"
            className="text-sm font-semibold df-text-secondary underline-offset-4 hover:text-foreground hover:underline"
          >
            ← Voltar ao início
          </Link>
        </p>
      </div>
    </main>
  );
}
