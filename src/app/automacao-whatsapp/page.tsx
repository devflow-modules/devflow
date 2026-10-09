import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, MessageCircle, Zap, UserRound } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { RelatedLinks } from "@/components/shared/related-links";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

const faqItems = [
  {
    q: "Automação substitui atendente?",
    a: "Não. Ela responde o que foi permitido. Quando a conversa exige contexto, exceção ou uma pessoa, ela segue para a equipe, com o histórico na fila.",
  },
  {
    q: "Preciso de API oficial da Meta?",
    a: "Sim. A operação usa a WhatsApp Cloud API oficial, com inbox, responsáveis e filas. A ativação do número é acompanhada.",
  },
  {
    q: "Quanto tempo leva para ver valor?",
    a: "A demo é uma simulação do fluxo. O diagnóstico define o que entra na implantação acompanhada.",
  },
];

const heroBullets = [
  "Automatize o repetitivo e leve exceções para a equipe",
  "Acompanhe responsáveis, filas e o estado das conversas",
  "A configuração inicial é acompanhada pela DevFlow",
];

const features = [
  {
    title: "Respostas automáticas",
    description:
      "Pode responder automaticamente fluxos permitidos quando a automação está ativa.",
  },
  {
    title: "Handoff para uma pessoa",
    description:
      "Quando o cliente pede atendente ou o fluxo exige, a conversa segue para a equipe.",
  },
  {
    title: "Estado da conversa",
    description:
      "Acompanhe responsáveis, filas e o que ainda precisa de resposta.",
  },
  {
    title: "Histórico compartilhado",
    description:
      "Quem assume a conversa vê o contexto que já estava no inbox.",
  },
];

const segmentLinks = [
  { href: "/automacao-whatsapp-restaurante", label: "Restaurantes" },
  { href: "/automacao-whatsapp-tabacaria", label: "Tabacarias" },
  { href: "/automacao-whatsapp-loja", label: "Lojas" },
  { href: "/automacao-whatsapp-clinica", label: "Clínicas" },
];

const howItWorksSteps = [
  {
    icon: MessageCircle,
    title: "Cliente envia mensagem no WhatsApp",
    description:
      "O cliente manda a primeira mensagem. Se a automação estiver ativa, o fluxo permitido pode responder.",
  },
  {
    icon: Zap,
    title: "A automação responde o que foi permitido",
    description:
      "Dúvidas do roteiro configurado podem ser respondidas automaticamente. O restante fica com a equipe.",
  },
  {
    icon: UserRound,
    title: "Encaminha para atendimento humano",
    description:
      "Quando o cliente pede ou o fluxo exige, o handoff conecta com sua equipe.",
  },
];

export const metadata: Metadata = {
  title: "Automação de WhatsApp para Empresas | DevFlow Labs",
  description:
    "Automatize o repetitivo no WhatsApp e encaminhe exceções para a equipe. Implantação acompanhada.",
  keywords: [
    "automação whatsapp empresa",
    "automação whatsapp atendimento",
    "automação whatsapp negócios",
    "sistema de automação whatsapp",
  ],
  alternates: {
    canonical: `${baseUrl}/automacao-whatsapp`,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "Automação de WhatsApp para Empresas | DevFlow Labs",
    description:
      "Automação supervisionada no WhatsApp: o repetitivo pode ser respondido e a exceção segue para a equipe.",
    url: `${baseUrl}/automacao-whatsapp`,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — automação de WhatsApp para empresas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Automação WhatsApp para Empresas | DevFlow Labs",
    description:
      "Automação no repetitivo, com handoff para a equipe. Implantação acompanhada.",
    images: [ogImage],
  },
};

export default function AutomacaoWhatsAppPage() {
  return (
    <main>
      <section
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="automacao-hero-heading"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1
              id="automacao-hero-heading"
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              Automação de WhatsApp para Empresas
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Automatize o repetitivo e leve exceções para a equipe. Inbox, responsáveis e handoff.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/demo"
                className={cn(
                  "inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold sm:w-auto",
                  "bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                )}
              >
                Ver demo
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <WhatsAppCta
                label="Falar com especialista"
                ariaLabel="Falar com especialista sobre automação de WhatsApp"
                size="lg"
                text="Quero automatizar o atendimento da minha empresa no WhatsApp — falar com especialista DevFlow."
                className="w-full justify-center sm:w-auto"
              />
            </div>
            <p className="mt-6 max-w-xl text-center text-sm text-muted-foreground">
              Produto completo:{" "}
              <Link href="/produtos/whatsapp-platform" className="font-medium text-primary underline-offset-4 hover:underline">
                WhatsApp Platform
              </Link>
              . Contexto de preços:{" "}
              <Link href="/precos" className="font-medium text-primary underline-offset-4 hover:underline">
                planos
              </Link>
              . Fluxo geral:{" "}
              <Link href="/como-funciona" className="font-medium text-primary underline-offset-4 hover:underline">
                como funciona
              </Link>
              . API oficial:{" "}
              <Link href="/whatsapp-business-api" className="font-medium text-primary underline-offset-4 hover:underline">
                WhatsApp Business API
              </Link>
              .
            </p>
            <ul className="mt-8 space-y-2 text-left sm:mx-auto sm:max-w-md" role="list">
              {heroBullets.map((bullet, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-foreground"
                    aria-hidden
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="features-heading"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="features-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            O que a automação entrega
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Automação supervisionada dentro da operação de conversas.
          </p>
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
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

      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="how-it-works-heading"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="how-it-works-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Como funciona
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Três passos simples da mensagem até o atendimento humano.
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
                <h3 className="mt-1 font-medium text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16 sm:py-20" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
          <h2 id="faq-heading" className="text-center text-xl font-semibold text-foreground sm:text-2xl">
            Perguntas frequentes
          </h2>
          <div className="mt-8 space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-card px-4 py-3 shadow-sm open:bg-muted/20"
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-2">
                    {item.q}
                    <span className="shrink-0 text-muted-foreground group-open:rotate-180 motion-safe:transition-transform">
                      ▼
                    </span>
                  </span>
                </summary>
                <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="segmentos-heading"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="segmentos-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Automação por segmento
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Páginas de exemplo por segmento. O desenho do fluxo entra no diagnóstico.
          </p>
          <div className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-3">
            {segmentLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium",
                  "text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                {item.label}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="cta-final-heading"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              "mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12"
            )}
          >
            <h2
              id="cta-final-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Quer automatizar seu WhatsApp?
            </h2>
            <p className="mt-4 text-muted-foreground">
              O próximo passo é o diagnóstico. A demo é uma simulação, com dados ilustrativos.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/demo"
                className={cn(
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold",
                  "bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                )}
              >
                Ver demo
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <WhatsAppCta
                label="Falar com especialista"
                ariaLabel="Falar com especialista sobre automação de WhatsApp"
                size="lg"
                text="Quero automatizar o atendimento da minha empresa no WhatsApp — falar com especialista DevFlow."
                className="justify-center"
              />
            </div>
            <p className="mt-6">
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Voltar ao Início
              </Link>
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-16">
        <RelatedLinks variant="automacao-whatsapp" title="Explore o ecossistema" />
      </div>
    </main>
  );
}
