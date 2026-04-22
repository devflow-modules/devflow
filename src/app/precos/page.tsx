import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

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
            Preços
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Veja como funciona na prática antes de qualquer proposta.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            <Link href="/demo" className="font-medium text-primary underline-offset-4 hover:underline">
              Ver demo guiada
            </Link>
            <span className="mx-2 text-border" aria-hidden>
              ·
            </span>
            <Link
              href="/produtos/whatsapp-platform"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Página do WhatsApp Platform
            </Link>
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
              <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
              <p className="mt-4 text-2xl font-bold text-foreground">
                {plan.price}
              </p>
              <ul className="mt-6 flex-1 space-y-3" role="list">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <WhatsAppCta
                  label="Falar com especialista"
                  ariaLabel="Falar com especialista no WhatsApp"
                  size="default"
                  text="Quero entender como aplicar isso no meu WhatsApp"
                />
              </div>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-border bg-muted/30 px-6 py-8 text-center">
          <p className="text-sm font-medium text-foreground">Prefere ver antes de falar?</p>
          <Link
            href="/demo"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
          >
            Ver demo
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-slate-600">
          * Consulte condições. Piloto de 7 dias grátis. Valores variam conforme
          volume e necessidades.
        </p>

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
