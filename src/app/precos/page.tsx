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
    name: "Implantação acompanhada",
    description: "Diagnóstico, desenho dos fluxos e configuração inicial com a DevFlow",
    price: "Projeto de implantação",
    features: [
      "Diagnóstico da operação",
      "Desenho dos fluxos",
      "Apoio na configuração do WhatsApp Cloud API",
      "Configuração da equipe",
      "Treinamento inicial",
    ],
    cta: "Agendar diagnóstico",
    ctaText: "Quero agendar um diagnóstico para implantar a operação de conversas no WhatsApp.",
    featured: false,
  },
  {
    name: "Operação mensal",
    description: "A equipe segue atendendo no inbox depois da implantação",
    price: "Mensalidade da plataforma",
    features: [
      "Inbox compartilhado",
      "Responsáveis e filas",
      "Histórico da conversa",
      "Handoff para uma pessoa",
      "Automação no repetitivo, quando configurada",
    ],
    cta: "Agendar diagnóstico",
    ctaText: "Quero entender a operação mensal da WhatsApp Platform depois da implantação acompanhada.",
    featured: true,
  },
];

export const metadata: Metadata = {
  title: "Preços | Operação de conversas no WhatsApp | DevFlow Labs",
  description:
    "Implantação acompanhada e operação mensal da WhatsApp Platform. O escopo é definido no diagnóstico.",
  alternates: {
    canonical: `${baseUrl}/precos`,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "Preços | DevFlow Labs",
    description:
      "Implantação acompanhada e mensalidade da operação de conversas no WhatsApp.",
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
    description: "Implantação acompanhada e operação mensal. Veja a demo antes do diagnóstico.",
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
            className="df-text-primary text-4xl font-bold tracking-tight sm:text-5xl"
          >
            Implantação acompanhada e operação mensal
          </h1>
          <p className="df-text-secondary mt-4 text-lg">
            O escopo e o valor saem do diagnóstico. Não há tabela pública de cotas, nem preço fechado nesta página.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={PRIMARY_DEMO_HREF}
              className={cn(
                "df-btn-primary inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold",
                "df-shadow-cta focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "flex flex-col rounded-2xl p-6",
                plan.featured
                  ? "df-surface-elevated df-bg-brand-soft ring-1 ring-[color-mix(in_srgb,var(--devflow-brand)_22%,transparent)]"
                  : "df-surface-elevated"
              )}
            >
              {plan.featured && (
                <span className="mb-4 inline-block w-fit rounded-full df-bg-brand-soft px-3 py-1 text-xs font-medium df-status-brand">
                  Depois da implantação
                </span>
              )}
              <h2 className="text-xl font-semibold df-text-primary">
                {plan.name}
              </h2>
              <p className="df-text-secondary mt-1 text-sm">{plan.description}</p>
              <p className="mt-4 text-2xl font-bold df-text-primary">
                {plan.price}
              </p>
              <ul className="mt-6 flex-1 space-y-3" role="list">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="df-text-secondary flex items-start gap-2 text-sm"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 df-status-brand" />
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

        <div className="mx-auto mt-12 max-w-lg df-surface-elevated rounded-2xl px-6 py-8 text-center">
          <p className="text-sm font-medium df-text-primary">
            Antes de falar com vendas, veja a plataforma funcionando
          </p>
          <p className="df-text-secondary mt-2 text-sm">
            Veja uma simulação de inbox, responsáveis, fila e handoff. Dados ilustrativos.
          </p>
          <Link
            href={PRIMARY_DEMO_HREF}
            className={cn(
              "df-btn-primary mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold sm:w-auto",
              "df-shadow-cta-soft"
            )}
          >
            {PRIMARY_DEMO_CTA_LABEL}
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        </div>

        <p className="df-text-secondary mt-8 text-center text-sm">
          O combinado depende do volume, da quantidade de números e do desenho da operação. Não publicamos cota de mensagens nem suporte contínuo fora do horário combinado no diagnóstico.
        </p>

        <section className="mx-auto mt-12 max-w-5xl" aria-labelledby="como-funciona-contratacao">
          <h2
            id="como-funciona-contratacao"
            className="df-text-primary text-center text-2xl font-semibold tracking-tight"
          >
            Como funciona a contratação
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <article className="df-surface-elevated rounded-2xl p-5">
              <h3 className="text-base font-semibold df-text-primary">Diagnóstico da operação</h3>
              <p className="df-text-secondary mt-2 text-sm">
                Entendemos volume, equipe, número de WhatsApp e gargalos.
              </p>
            </article>
            <article className="df-surface-elevated rounded-2xl p-5">
              <h3 className="text-base font-semibold df-text-primary">Implantação guiada</h3>
              <p className="df-text-secondary mt-2 text-sm">
                Configuramos número, inbox, automações iniciais, responsáveis e handoff.
              </p>
            </article>
            <article className="df-surface-elevated rounded-2xl p-5">
              <h3 className="text-base font-semibold df-text-primary">Mensalidade da plataforma</h3>
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
                "df-shadow-cta"
              )}
            >
              {PRIMARY_CONVERT_CTA_LABEL}
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
          </div>
        </section>

        <div className="mx-auto mt-14 max-w-xl df-surface-elevated rounded-2xl px-6 py-8 text-center shadow-sm sm:px-10">
          <p className="text-sm font-semibold df-text-primary">Próximo passo</p>
          <p className="df-text-secondary mt-2 text-sm leading-relaxed">
            Veja a demo guiada para tirar dúvidas; quando fizer sentido, agendamos o diagnóstico da operação.
          </p>
          <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <Link
              href={PRIMARY_DEMO_HREF}
              className={cn(
                "df-btn-primary inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold",
                "df-shadow-cta"
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
            className="text-sm font-medium df-status-brand hover:underline"
          >
            Ver produto completo
          </Link>
        </p>
      </div>
    </main>
  );
}
