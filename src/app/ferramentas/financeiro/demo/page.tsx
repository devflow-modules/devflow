"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  trackFinanceiroDemoConvertedToSignup,
  trackFinanceiroDemoOpened,
} from "@/lib/analytics";
import { FinanceiroHealthScorePanel } from "@/modules/financeiro/components/health/FinanceiroHealthScorePanel";
import { FinanceiroInsightsPanel } from "@/modules/financeiro/components/insights/FinanceiroInsightsPanel";
import { MonthlyChecklistPanel } from "@/modules/financeiro/components/routine/MonthlyChecklistPanel";
import { buildDemoDashboardBundle } from "@/modules/financeiro/demo/buildDemoDashboardBundle";
import {
  FINANCEIRO_AUTH_PATH,
  FINANCEIRO_DASHBOARD_PATH,
} from "@/modules/financeiro/navigation/constants";
import { financeiroAuthWithNext } from "@/modules/financeiro/navigation/authHref";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";

const signupHref = financeiroAuthWithNext(FINANCEIRO_DASHBOARD_PATH, FINANCEIRO_AUTH_PATH);

export default function FinanceiroDemoPage() {
  const bundle = useMemo(() => buildDemoDashboardBundle(), []);

  useEffect(() => {
    trackFinanceiroDemoOpened({ surface: "demo_page" });
  }, []);

  const onConvert = (cta: string) => {
    trackFinanceiroDemoConvertedToSignup({ cta, surface: "demo_page" });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-foreground">
      <header
        className="sticky top-0 z-10 border-b border-amber-200/80 bg-amber-50/95 px-4 py-3 shadow-sm backdrop-blur-sm md:py-3.5"
        role="banner"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-snug text-amber-950">
            <span className="font-semibold">Modo demonstração.</span> Este é um exemplo do seu painel com
            dados fictícios — nada é salvo.
          </p>
          <Link
            href={signupHref}
            onClick={() => onConvert("header_cta")}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90",
              focusRingLight
            )}
          >
            Criar conta — usar com seus dados
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 pb-16 md:space-y-6 md:py-8">
        <FinanceiroHealthScorePanel
          result={bundle.healthScore}
          isLoading={false}
          isOwner
          householdId={bundle.householdId}
          isDemo
          demoAuthBase={FINANCEIRO_AUTH_PATH}
        />
        <FinanceiroInsightsPanel
          insights={bundle.insights}
          isLoading={false}
          isDemo
          demoAuthBase={FINANCEIRO_AUTH_PATH}
        />
        <MonthlyChecklistPanel
          tasks={bundle.tasks}
          isLoading={false}
          isDemo
          demoAuthBase={FINANCEIRO_AUTH_PATH}
        />

        <section
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
          aria-labelledby="demo-footer-cta"
        >
          <h2 id="demo-footer-cta" className="text-base font-semibold text-foreground md:text-lg">
            Gostou do que viu?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Comece de verdade com receitas, despesas e regras do seu mês — o score e os alertas passam a refletir
            a sua vida financeira.
          </p>
          <Link
            href={signupHref}
            onClick={() => onConvert("footer_cta")}
            className={cn(
              "mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto",
              focusRingLight
            )}
          >
            Começar de verdade
          </Link>
        </section>
      </main>
    </div>
  );
}
