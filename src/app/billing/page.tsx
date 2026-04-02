import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, CreditCard, ArrowUpRight } from "lucide-react";
import { Plans } from "@/modules/billing/plans";
import { ManageSubscriptionButton } from "./ManageSubscriptionButton";
import { BillingPortalReturnBanner } from "./BillingPortalReturnBanner";

export const metadata: Metadata = {
  title: "Assinatura | DevFlow",
  description: "Gerencie sua assinatura e plano.",
  robots: "noindex, nofollow",
};

const planBenefits: Record<string, string[]> = {
  FREE: [
    `Até ${Plans.FREE.maxHouseholds} casa`,
    `Até ${Plans.FREE.maxRules} regras de rateio`,
    "Acesso básico ao financeiro",
  ],
  PRO: [
    `Até ${Plans.PRO.maxHouseholds} casas`,
    `Até ${Plans.PRO.maxRules} regras de rateio`,
    "Regras avançadas",
    "Exportação de dados",
    "Analytics avançado",
  ],
  TEAM: [
    `Até ${Plans.TEAM.maxHouseholds} casas`,
    `Até ${Plans.TEAM.maxRules} regras de rateio`,
    "Todos os recursos PRO",
    "Múltiplos colaboradores",
    "Suporte prioritário",
  ],
};

type SearchParams = Promise<{
  success?: string;
  cancel?: string;
  /** Defina na return_url do Stripe Customer Portal, ex.: ?portal_return=1 */
  portal_return?: string;
}>;

export default async function BillingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const financeiroBase = process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL?.replace(/\/$/, "");
  if (financeiroBase) {
    const qs = new URLSearchParams();
    if (params.success === "1") qs.set("success", "1");
    if (params.cancel === "1") qs.set("cancel", "1");
    if (params.portal_return === "1") qs.set("portal_return", "1");
    const suffix = qs.toString() ? `?${qs}` : "";
    redirect(`${financeiroBase}/billing${suffix}`);
  }

  const isSuccess = params.success === "1";
  const isCancelled = params.cancel === "1";
  const portalReturn = params.portal_return === "1";

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-12">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Assinatura</h1>
          <p className="mt-2 text-muted-foreground">
            Gerencie plano, método de pagamento e histórico — o retorno do portal Stripe fica explícito abaixo.
          </p>
        </div>

        {portalReturn ? <BillingPortalReturnBanner /> : null}

        {/* Alertas de retorno do Stripe */}
        {isSuccess && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            Pagamento confirmado! Seu plano foi atualizado.
          </div>
        )}
        {isCancelled && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Checkout cancelado. Seu plano não foi alterado.
          </div>
        )}

        {/* Card de plano atual */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Plano atual</p>
              <p className="mt-1 text-2xl font-bold text-foreground">FREE</p>
            </div>
            <CreditCard className="mt-1 h-6 w-6 shrink-0 text-muted-foreground" />
          </div>

          <ul className="mt-4 space-y-2">
            {planBenefits.FREE.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs text-muted-foreground">
            Para ver o plano real, faça login no app financeiro.
          </p>
        </div>

        {/* Ações */}
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Ações</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Gerenciar assinatura (Customer Portal) */}
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-1 text-sm font-semibold text-foreground">Gerenciar assinatura</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Cancele, faça upgrade/downgrade, atualize o método de pagamento ou veja o histórico.
              </p>
              <ManageSubscriptionButton />
            </div>

            {/* Fazer upgrade */}
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-1 text-sm font-semibold text-foreground">Fazer upgrade</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Desbloqueie mais casas, regras e funcionalidades avançadas.
              </p>
              <Link
                href="/upgrade"
                className="flex items-center gap-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-muted sm:w-auto"
              >
                Fazer upgrade
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="pt-2 text-center">
            <Link href="/pricing" className="text-sm text-primary hover:underline">
              Ver todos os planos e preços
            </Link>
          </div>
        </div>

        {/* Benefícios por plano */}
        <div className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Compare os planos</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["PRO", "TEAM"] as const).map((planId) => (
              <div key={planId} className="rounded-xl border border-border bg-card p-4">
                <p className="mb-3 font-semibold text-foreground">{planId}</p>
                <ul className="space-y-1.5">
                  {planBenefits[planId].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
