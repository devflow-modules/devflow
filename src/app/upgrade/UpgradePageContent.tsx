"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Check, ArrowRight, ShieldCheck } from "lucide-react";
import { Plans } from "@/modules/billing/plans";
import { UpgradeCta } from "./UpgradeCta";
import { trackUpgradeReturn } from "@/lib/analytics";
import {
  formatPlanLimitsSummary,
  planAudience,
  planTagline,
} from "@/modules/billing/pricingPresentation";
import { upgradeReturnStateFromSearchParams } from "@/modules/billing/billingUiState";

type Props = {
  initialSuccess: boolean;
  initialCancel: boolean;
  planHint?: string | null;
};

export function UpgradePageContent({ initialSuccess, initialCancel, planHint }: Props) {
  const tracked = useRef(false);
  const returnState = upgradeReturnStateFromSearchParams({
    success: initialSuccess ? "1" : undefined,
    cancel: initialCancel ? "1" : undefined,
  });

  useEffect(() => {
    if (returnState === "idle" || tracked.current) return;
    tracked.current = true;
    trackUpgradeReturn({
      status: returnState === "success" ? "success" : "cancel",
      planId: planHint ?? null,
    });
    if (returnState === "success") {
      try {
        sessionStorage.removeItem("billing_checkout_pending");
      } catch {
        /* noop */
      }
    }
  }, [returnState, planHint]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Fechamento comercial</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Próximo passo: colocar no ar
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Você já viu o valor do Financeiro na demo. Abaixo está o caminho mais curto para assinar: um clique abre o
          checkout Stripe; ao voltar, mostramos o resultado com clareza.
        </p>

        {returnState === "success" && (
          <div
            className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
            role="status"
          >
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">Checkout concluído</p>
            <p className="mt-1 text-sm text-emerald-900/90 dark:text-emerald-100/90">
              O Stripe confirmou o fluxo. Se o pagamento foi aprovado, o plano será refletido após o webhook — em geral
              em segundos. Abra o Financeiro ou a área de assinatura para validar.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/ferramentas/financeiro/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Ir ao dashboard
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/billing"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/40 bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-emerald-100/50 dark:hover:bg-emerald-950/60"
              >
                Ver assinatura
              </Link>
            </div>
            {planHint ? (
              <p className="mt-3 text-xs text-emerald-800/80 dark:text-emerald-200/80">Plano escolhido: {planHint}</p>
            ) : null}
          </div>
        )}

        {returnState === "cancel" && (
          <div
            className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
            role="status"
          >
            <p className="font-semibold">Checkout interrompido</p>
            <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
              Nada foi cobrado. Quando quiser retomar, use o botão abaixo — o mesmo fluxo seguro do Stripe.
            </p>
          </div>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border-2 border-primary bg-card p-6 shadow-md ring-2 ring-primary/15">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">Recomendado na demo</span>
            <h2 className="mt-2 text-xl font-bold text-foreground">PRO</h2>
            <p className="mt-1 text-sm text-muted-foreground">{planTagline("PRO")}</p>
            <p className="mt-2 text-xs text-muted-foreground">{planAudience("PRO")}</p>
            <p className="mt-3 text-sm font-medium text-foreground">{formatPlanLimitsSummary("PRO")}</p>
            <ul className="mt-4 space-y-2 text-sm text-foreground">
              {[
                "Regras avançadas de rateio",
                "Exportação e analytics",
                "Ideal para PJ + PF no mesmo painel",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <UpgradeCta planId="PRO" surface="upgrade">
                Assinar PRO — abrir checkout
              </UpgradeCta>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-bold text-foreground">TEAM</h2>
            <p className="mt-1 text-sm text-muted-foreground">{planTagline("TEAM")}</p>
            <p className="mt-2 text-xs text-muted-foreground">{planAudience("TEAM")}</p>
            <p className="mt-3 text-sm font-medium text-foreground">{formatPlanLimitsSummary("TEAM")}</p>
            <ul className="mt-4 space-y-2 text-sm text-foreground">
              {[
                `Até ${Plans.TEAM.maxHouseholds} casas`,
                `Até ${Plans.TEAM.maxRules} regras`,
                "Mesmos recursos avançados do PRO, com escala",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <UpgradeCta planId="TEAM" surface="upgrade" variant="secondary">
                Assinar TEAM — abrir checkout
              </UpgradeCta>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-medium text-foreground">Transparência</p>
            <p className="mt-1">
              O valor final e a renovação aparecem no Stripe antes de confirmar. Em ambiente de teste, use cartões de
              teste da documentação Stripe — sem cobrança real.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Comparar tudo lado a lado?{" "}
          <Link href="/pricing" className="font-semibold text-primary hover:underline">
            Ver página de planos
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Já assina?{" "}
          <Link href="/billing" className="font-semibold text-primary hover:underline">
            Gerenciar assinatura
          </Link>
        </p>
      </main>
    </div>
  );
}
