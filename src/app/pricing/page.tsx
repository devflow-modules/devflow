import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Plans, type PlanId } from "@/modules/billing/plans";
import { PricingViewTracker } from "./PricingViewTracker";
import { PricingPlanCta } from "./PricingPlanCta";
import { cn } from "@/lib/utils";
import {
  formatPlanLimitsSummary,
  planAudience,
  planTagline,
} from "@/modules/billing/pricingPresentation";

export const metadata: Metadata = {
  title: "Planos | DevFlow",
  description: "FREE, PRO e TEAM — fechamento claro para demo comercial e upgrade via Stripe.",
  robots: "noindex, nofollow",
};

const planOrder: PlanId[] = ["FREE", "PRO", "TEAM"];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <PricingViewTracker />
      <main className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Monetização</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Planos que fecham a conversa
          </h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            <strong className="text-foreground">FREE</strong> para provar valor,{" "}
            <strong className="text-foreground">PRO</strong> para operação séria (o plano que mais vendemos na demo),{" "}
            <strong className="text-foreground">TEAM</strong> quando a escala pede mais casas e regras. Preço e fatura
            confirmados no checkout Stripe — sem surpresa.
          </p>
        </header>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {planOrder.map((id) => {
            const plan = Plans[id];
            const isPro = id === "PRO";
            const isTeam = id === "TEAM";
            return (
              <div
                key={id}
                className={cn(
                  "flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md",
                  isPro && "df-bg-brand-soft ring-2 ring-[color-mix(in_srgb,var(--devflow-brand)_22%,transparent)] lg:scale-[1.02] lg:shadow-lg"
                )}
              >
                {isPro && (
                  <span className="mb-2 inline-block w-fit rounded-full df-bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide df-status-brand">
                    CTA principal da demo
                  </span>
                )}
                {isTeam && !isPro && (
                  <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Escala
                  </span>
                )}
                {id === "FREE" && (
                  <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Entrada
                  </span>
                )}
                <h2 className="text-2xl font-bold text-foreground">{plan.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{planTagline(id)}</p>
                <p className="mt-2 text-xs text-muted-foreground">{planAudience(id)}</p>
                <p className="mt-3 text-sm font-medium text-foreground">{formatPlanLimitsSummary(id)}</p>

                <ul className="mt-5 flex-1 space-y-2.5 text-sm text-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 df-status-success" />
                    {plan.maxHouseholds === 1 ? "1 casa financeira" : `Até ${plan.maxHouseholds} casas`}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 df-status-success" />
                    Até {plan.maxRules} regras de rateio
                  </li>
                  <li className="flex items-center gap-2">
                    {plan.features.advancedRules ? (
                      <Check className="h-4 w-4 shrink-0 df-status-success" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 text-center text-muted-foreground">—</span>
                    )}
                    Regras avançadas
                  </li>
                  <li className="flex items-center gap-2">
                    {plan.features.exports ? (
                      <Check className="h-4 w-4 shrink-0 df-status-success" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 text-center text-muted-foreground">—</span>
                    )}
                    Exportação de dados
                  </li>
                  <li className="flex items-center gap-2">
                    {plan.features.analytics ? (
                      <Check className="h-4 w-4 shrink-0 df-status-success" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 text-center text-muted-foreground">—</span>
                    )}
                    Analytics avançado
                  </li>
                </ul>

                <div className="mt-8">
                  <PricingPlanCta planId={id} isPro={isPro} surface="pricing" />
                </div>
              </div>
            );
          })}
        </div>

        <section className="mx-auto mt-14 max-w-3xl rounded-2xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Resumo para apresentação</p>
          <ul className="mt-3 space-y-2 text-left md:mx-auto md:max-w-lg">
            <li>
              <span className="font-medium text-foreground">FREE</span> — validação rápida, sem cartão.
            </li>
            <li>
              <span className="font-medium text-foreground">PRO</span> — fechamento natural após a demo (várias casas +
              automação fiscal do dia a dia).
            </li>
            <li>
              <span className="font-medium text-foreground">TEAM</span> — mesmo pacote de recursos, com limites maiores
              para mais estrutura.
            </li>
          </ul>
        </section>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Checkout e portal usam Stripe (cartões de teste em dev). Webhooks atualizam o plano automaticamente.
        </p>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Já é assinante?{" "}
          <Link href="/billing" className="font-semibold text-primary hover:underline">
            Gerenciar assinatura
          </Link>
          {" · "}
          <Link href="/upgrade" className="font-semibold text-primary hover:underline">
            Página de upgrade
          </Link>
        </p>
      </main>
    </div>
  );
}
