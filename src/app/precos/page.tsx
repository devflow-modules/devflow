import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import {
  PRIMARY_CONVERT_CTA_LABEL,
  PRIMARY_DEMO_CTA_LABEL,
  PRIMARY_DEMO_HREF,
} from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

const plans = [
  {
    name: "Starter",
    description: "Para negócios que querem sair do atendimento manual",
    price: "Implantação guiada + mensalidade",
    features: [
      "Até 1.000 mensagens/mês",
      "1 número WhatsApp",
      "Respostas automáticas essenciais",
      "Inbox com handoff humano",
      "Suporte por e-mail",
    ],
    cta: "Agendar diagnóstico",
    ctaText: "Quero agendar diagnóstico para avaliar implantação guiada e mensalidade da operação.",
    featured: false,
  },
  {
    name: "Pro",
    description: "Para negócios com equipe e maior volume de atendimento",
    price: "Implantação guiada + mensalidade",
    features: [
      "Mensagens ilimitadas*",
      "Múltiplos números",
      "Métricas avançadas",
      "Integrações",
      "Suporte prioritário",
    ],
    badgeLabel: "Mais recomendado",
    cta: "Montar plano Pro",
    ctaText: "Quero montar um plano Pro com implantação guiada para meu volume de atendimento.",
    featured: true,
  },
  {
    name: "Enterprise",
    description: "Para operações com múltiplas unidades, SLA e personalização",
    price: "Projeto sob medida",
    features: [
      "Operação personalizada",
      "SLA dedicado",
      "Onboarding assistido",
      "Treinamento da equipe",
      "Suporte 24/7",
    ],
    cta: "Falar sobre escala",
    ctaText: "Quero falar sobre escala com projeto sob medida, implantação e evolução contínua.",
    featured: false,
  },
];

export const metadata: Metadata = {
  title: "Preços | Automação WhatsApp | DevFlow Labs",
  description:
    "Planos de automação de atendimento no WhatsApp. Starter, Pro e Enterprise. Piloto grátis para testar.",
  alternates: {
    canonical: `${baseUrl}/precos`,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "Preços | DevFlow Labs",
    description:
      "Planos de automação WhatsApp. Piloto grátis para testar.",
    url: `${baseUrl}/precos`,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — preços e planos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Preços | DevFlow Labs",
    description: "Planos Starter, Pro e Enterprise — veja a demo antes da proposta.",
    images: [ogImage],
  },
};

export default function PrecosPage() {
  return (
    <main className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1
            id="precos-heading"
            className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
          >
            Planos para operar seu WhatsApp com automação, inbox e atendimento humano
          </h1>
          <p className="df-text-secondary mt-4 text-lg">
            A DevFlow Labs configura sua operação, ativa o número, organiza sua equipe e deixa o WhatsApp pronto para vender com controle.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={PRIMARY_DEMO_HREF}
              className={cn(
                "df-btn-primary inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold",
                "shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              )}
            >
              {PRIMARY_DEMO_CTA_LABEL}
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
            <Link
              href="/produtos/whatsapp-platform"
              className="df-btn-secondary inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold"
            >
              Entender WhatsApp Platform
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "flex flex-col rounded-2xl border p-6",
                plan.featured
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-card"
              )}
            >
              {plan.featured && (
                <span className="mb-4 inline-block w-fit rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  {plan.badgeLabel}
                </span>
              )}
              <h2 className="text-xl font-semibold text-foreground">
                {plan.name}
              </h2>
              <p className="df-text-secondary mt-1 text-sm">{plan.description}</p>
              <p className="mt-4 text-2xl font-bold text-foreground">
                {plan.price}
              </p>
              <ul className="mt-6 flex-1 space-y-3" role="list">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="df-text-secondary flex items-start gap-2 text-sm"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <WhatsAppCta
                  label={plan.cta}
                  ariaLabel={plan.cta}
                  size="default"
                  text={plan.ctaText}
                />
              </div>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-border bg-muted/30 px-6 py-8 text-center">
          <p className="text-sm font-medium text-foreground">
            Antes de falar com vendas, veja a plataforma funcionando
          </p>
          <p className="df-text-secondary mt-2 text-sm">
            Veja a inbox, automações, handoff humano e métricas em uma demonstração guiada.
          </p>
          <Link
            href={PRIMARY_DEMO_HREF}
            className={cn(
              "df-btn-primary mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold sm:w-auto",
              "shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)]"
            )}
          >
            {PRIMARY_DEMO_CTA_LABEL}
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        </div>

        <p className="df-text-secondary mt-8 text-center text-sm">
          * O plano final depende do volume de mensagens, quantidade de números, integrações e nível de implantação. Projetos podem incluir setup inicial + mensalidade recorrente.
        </p>

        <section className="mx-auto mt-12 max-w-5xl" aria-labelledby="como-funciona-contratacao">
          <h2
            id="como-funciona-contratacao"
            className="text-center text-2xl font-semibold tracking-tight text-foreground"
          >
            Como funciona a contratação
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <article className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold text-foreground">Diagnóstico da operação</h3>
              <p className="df-text-secondary mt-2 text-sm">
                Entendemos volume, equipe, número de WhatsApp e gargalos.
              </p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold text-foreground">Implantação guiada</h3>
              <p className="df-text-secondary mt-2 text-sm">
                Configuramos número, inbox, automações iniciais, handoff e métricas.
              </p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold text-foreground">Mensalidade da plataforma</h3>
              <p className="df-text-secondary mt-2 text-sm">
                Após ativação, você mantém a operação rodando com suporte e evolução.
              </p>
            </article>
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              href="/contato"
              className={cn(
                "df-btn-primary inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold",
                "shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)]"
              )}
            >
              {PRIMARY_CONVERT_CTA_LABEL}
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
          </div>
        </section>

        <div className="mx-auto mt-14 max-w-xl rounded-2xl border border-border bg-card px-6 py-8 text-center shadow-sm sm:px-10">
          <p className="text-sm font-semibold text-foreground">Próximo passo</p>
          <p className="df-text-secondary mt-2 text-sm leading-relaxed">
            Veja a demo guiada para tirar dúvidas; quando fizer sentido, agendamos o diagnóstico da operação.
          </p>
          <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <Link
              href={PRIMARY_DEMO_HREF}
              className={cn(
                "df-btn-primary inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold",
                "shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)]"
              )}
            >
              {PRIMARY_DEMO_CTA_LABEL}
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
            <Link
              href="/contato"
              className="df-btn-secondary inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold"
            >
              {PRIMARY_CONVERT_CTA_LABEL}
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center">
          <Link
            href="/produtos/whatsapp-platform"
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver produto completo
          </Link>
        </p>
      </div>
    </main>
  );
}
