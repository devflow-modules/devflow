import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Plans, type PlanId } from "@/modules/billing/plans";
import { PricingViewTracker } from "./PricingViewTracker";
import { PricingPlanCta } from "./PricingPlanCta";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Planos | DevFlow",
  description: "Planos FREE, PRO e TEAM para o controle financeiro.",
  robots: "noindex, nofollow",
};

const planOrder: PlanId[] = ["FREE", "PRO", "TEAM"];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <PricingViewTracker />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold text-foreground">Planos</h1>
        <p className="mb-10 text-muted-foreground">
          Escolha o plano ideal. Sem cartão no FREE.
        </p>

        <div className="grid gap-8 md:grid-cols-3">
          {planOrder.map((id) => {
            const plan = Plans[id];
            const isPro = id === "PRO";
            return (
              <div
                key={id}
                className={cn(
                  "flex flex-col rounded-2xl border bg-card p-6 shadow-sm",
                  isPro && "border-primary ring-2 ring-primary/20"
                )}
              >
                {isPro && (
                  <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-wide text-primary">
                    Recomendado
                  </span>
                )}
                <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                <ul className="mt-4 flex-1 space-y-3 text-sm text-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    Até {plan.maxHouseholds} {plan.maxHouseholds === 1 ? "casa" : "casas"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    Até {plan.maxRules} regras de rateio
                  </li>
                  <li className="flex items-center gap-2">
                    {plan.features.advancedRules ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 text-muted-foreground">—</span>
                    )}
                    Regras avançadas
                  </li>
                  <li className="flex items-center gap-2">
                    {plan.features.exports ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 text-muted-foreground">—</span>
                    )}
                    Exportação de dados
                  </li>
                  <li className="flex items-center gap-2">
                    {plan.features.analytics ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 text-muted-foreground">—</span>
                    )}
                    Analytics avançado
                  </li>
                </ul>
                <div className="mt-6">
                  <PricingPlanCta planId={id} isPro={isPro} />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Pagamento seguro via Stripe. Redirecionamos você ao checkout para PRO e TEAM.
        </p>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Já é assinante?{" "}
          <Link href="/billing" className="text-primary hover:underline">
            Gerencie sua assinatura
          </Link>
        </p>
      </main>
    </div>
  );
}
