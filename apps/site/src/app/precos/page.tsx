import type { Metadata } from "next";
import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";

const plans = [
  {
    name: "Starter",
    description: "Para começar a automatizar",
    price: "Sob consulta",
    features: [
      "Até 1.000 mensagens/mês",
      "1 número WhatsApp",
      "Respostas automáticas",
      "Handoff humano",
      "Suporte por email",
    ],
    cta: "Quero orçamento",
    text: "Olá, quero solicitar uma proposta para o plano Starter.",
    featured: false,
  },
  {
    name: "Pro",
    description: "Para negócios em crescimento",
    price: "Sob consulta",
    features: [
      "Mensagens ilimitadas*",
      "Múltiplos números",
      "Métricas avançadas",
      "Integrações",
      "Suporte prioritário",
    ],
    cta: "Quero orçamento",
    text: "Olá, quero solicitar uma proposta para o plano Pro.",
    featured: true,
  },
  {
    name: "Enterprise",
    description: "Para operações em escala",
    price: "Sob consulta",
    features: [
      "Personalizado",
      "SLA dedicado",
      "Onboarding assistido",
      "Treinamento da equipe",
      "Suporte 24/7",
    ],
    cta: "Quero proposta",
    text: "Olá, quero uma proposta Enterprise para minha empresa.",
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
    title: "Preços | DevFlow Labs",
    description:
      "Planos de automação WhatsApp. Piloto grátis para testar.",
    url: `${baseUrl}/precos`,
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
            Preços
          </h1>
          <p className="mt-4 text-lg df-text-secondary">
            Implantação sob medida. Plano conforme volume e operação.
            Demonstração antes da proposta.
          </p>
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
                  Mais popular
                </span>
              )}
              <h2 className="text-xl font-semibold text-foreground">
                {plan.name}
              </h2>
              <p className="mt-1 text-sm df-text-secondary">{plan.description}</p>
              <p className="mt-4 text-2xl font-bold text-foreground">
                {plan.price}
              </p>
              <ul className="mt-6 flex-1 space-y-3" role="list">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm df-text-secondary"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <WhatsAppCta
                  label={plan.cta}
                  size="default"
                  text={plan.text}
                />
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm df-text-secondary">
          * Consulte condições. Piloto de 7 dias grátis. Valores variam conforme
          volume e necessidades.
        </p>

        <p className="mt-8 text-center">
          <Link
            href="/automacao-whatsapp"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Ver automação WhatsApp
          </Link>
        </p>
      </div>
    </main>
  );
}
