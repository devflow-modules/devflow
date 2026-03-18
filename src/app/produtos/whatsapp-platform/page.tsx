import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, MessageCircle, Zap, UserRound } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { RelatedLinks } from "@/components/shared/related-links";
import { cn } from "@/lib/utils";

const heroBullets = [
  "Automação que responde 24/7 sem perder qualidade",
  "Métricas em tempo real e handoff para equipe humana",
  "Operação confiável para escalar o atendimento",
];

const features = [
  {
    title: "Respostas automáticas",
    description:
      "O sistema responde sozinho perguntas frequentes, 24/7, sem ocupar a equipe.",
  },
  {
    title: "Handoff inteligente",
    description:
      "Quando o cliente pede atendente ou o fluxo exige, a conversa vai para humano na hora.",
  },
  {
    title: "Métricas por intent e horário",
    description:
      "Veja o que foi automatizado e o que virou atendimento, em tempo real.",
  },
  {
    title: "Visão operacional",
    description:
      "Dashboards simples para acompanhar performance e volume da operação.",
  },
  {
    title: "Alertas e limites",
    description:
      "Configure avisos e limites para não perder o controle do volume ou custos.",
  },
  {
    title: "Segurança e confiabilidade",
    description:
      "Infraestrutura estável, logs e rastreabilidade para operar com tranquilidade.",
  },
];

const howItWorksSteps = [
  {
    icon: MessageCircle,
    title: "Cliente envia mensagem no WhatsApp",
    description:
      "O cliente manda a primeira mensagem. O sistema recebe e identifica a intenção.",
  },
  {
    icon: Zap,
    title: "O sistema responde automaticamente",
    description:
      "Conforme a intenção, a resposta é enviada na hora — sem fila, sem espera.",
  },
  {
    icon: UserRound,
    title: "Encaminha para atendimento humano",
    description:
      "Quando o cliente pede ou o fluxo exige, o handoff conecta com sua equipe.",
  },
];

const trustCards = [
  {
    title: "Assinatura Meta",
    description: "Integração oficial com a API do WhatsApp Business.",
  },
  {
    title: "Dedupe por mensagem",
    description: "Evita processamento duplicado e garante consistência.",
  },
  {
    title: "Audit log e rastreabilidade",
    description: "Registro completo de eventos para auditoria e suporte.",
  },
  {
    title: "Operação com testes e logs",
    description: "Ambiente preparado para testes e monitoramento em produção.",
  },
];

const baseUrl = "https://devflowlabs.com.br";

export const metadata: Metadata = {
  title: "DevFlow WhatsApp Platform",
  alternates: {
    canonical: `${baseUrl}/produtos/whatsapp-platform`,
  },
  description:
    "Plataforma de automação de atendimento no WhatsApp com respostas automáticas, handoff inteligente, métricas e controle operacional. SaaS para escala.",
  openGraph: {
    title: "DevFlow WhatsApp Platform | Automação de Atendimento",
    description:
      "Automação de atendimento no WhatsApp com métricas, handoff e controle da operação. Produto SaaS da DevFlow Labs.",
    url: "https://devflowlabs.com.br/produtos/whatsapp-platform",
  },
  twitter: {
    title: "DevFlow WhatsApp Platform",
    description:
      "Automação de atendimento no WhatsApp com métricas, handoff e controle da operação. Produto SaaS da DevFlow Labs.",
  },
};

export default function WhatsAppPlatformPage() {
  return (
    <main>
      {/* 1. Hero do produto */}
      <section
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="product-hero-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1
              id="product-hero-heading"
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              DevFlow WhatsApp Platform
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Automação de atendimento no WhatsApp com métricas, handoff e
              controle real da operação.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <WhatsAppCta
                label="Falar no WhatsApp"
                size="lg"
                text="Quero saber mais sobre a DevFlow WhatsApp Platform."
              />
              <Link
                href="/automacao-whatsapp-tabacaria"
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-12 rounded-2xl border border-border px-5 text-base font-medium",
                  "bg-background text-foreground transition-colors hover:bg-muted"
                )}
              >
                Ver solução para tabacarias
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
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

      {/* 2. O que a plataforma entrega */}
      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="features-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="features-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            O que a plataforma entrega
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Recursos para automatizar, medir e controlar o atendimento.
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
                <h3 className="mt-1 font-medium text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Prova visual */}
      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="proof-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="proof-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Controle do atendimento em um só lugar
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Veja o que foi resolvido automaticamente e o que precisou de
            atendente.
          </p>

          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3 sm:gap-6">
            <div
              className={cn(
                "rounded-2xl border border-border bg-card p-6 shadow-sm"
              )}
            >
              <p className="text-sm font-medium text-muted-foreground">
                Mensagens recebidas
              </p>
              <p className="mt-2 text-3xl font-semibold text-foreground">287</p>
            </div>
            <div
              className={cn(
                "rounded-2xl border border-border bg-card p-6 shadow-sm"
              )}
            >
              <p className="text-sm font-medium text-muted-foreground">
                Resolvidas automaticamente
              </p>
              <p className="mt-2 text-3xl font-semibold text-foreground">176</p>
            </div>
            <div
              className={cn(
                "rounded-2xl border border-border bg-card p-6 shadow-sm"
              )}
            >
              <p className="text-sm font-medium text-muted-foreground">
                Encaminhadas para atendente
              </p>
              <p className="mt-2 text-3xl font-semibold text-foreground">111</p>
            </div>
          </div>

          <div
            className={cn(
              "mx-auto mt-8 max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
            )}
          >
            <p className="text-xs text-muted-foreground/80">
              Exemplo ilustrativo de visualização da operação
            </p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Visão do painel
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Inbound
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">287</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  últimas 24h
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Handoff
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">111</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  para atendente
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Horário de pico
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  14h–18h
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">hoje</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Taxa de automação
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  61,3%
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  resolvido pelo bot
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Seção de confiança */}
      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="trust-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="trust-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Confiança e operação
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Infraestrutura e processos que garantem uma operação sólida.
          </p>
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {trustCards.map((card) => (
              <article
                key={card.title}
                className={cn(
                  "rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
                )}
              >
                <h3 className="font-medium text-foreground">{card.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {card.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CTA final */}
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
            <h2
              id="cta-final-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Quer conhecer a plataforma?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Fala com a gente no WhatsApp e veja como a DevFlow pode ajudar sua
              operação.
            </p>
            <div className="mt-8">
              <WhatsAppCta
                label="Falar no WhatsApp"
                size="lg"
                text="Quero conhecer a DevFlow WhatsApp Platform."
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-8">
        <RelatedLinks variant="produtos" title="Explore o ecossistema" />
      </div>

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
