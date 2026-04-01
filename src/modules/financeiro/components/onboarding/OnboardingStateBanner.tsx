"use client";

import Link from "next/link";
import type { OnboardingBannerVariant } from "@/modules/financeiro/onboarding/useFinanceiroOnboarding";
import { FINANCEIRO_EXPENSES_PATH } from "@/modules/financeiro/navigation/constants";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";

type Props = {
  variant: OnboardingBannerVariant;
  onDismissCelebration: () => void;
};

const btnClass =
  "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:opacity-90 sm:flex-none sm:min-w-[160px]";

export function OnboardingStateBanner({ variant, onDismissCelebration }: Props) {
  if (!variant) return null;

  if (variant === "initial") {
    return (
      <section
        className="scroll-mt-24 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/90 to-white p-4 shadow-sm md:p-6"
        aria-labelledby="financeiro-onboarding-title"
      >
        <h2 id="financeiro-onboarding-title" className="text-lg font-semibold text-foreground md:text-xl">
          Seu mês ainda não começou.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
          Adicione uma receita e uma despesa para ver como ele está organizado — score, alertas e próximos passos aparecem
          na hora.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href={`${FINANCEIRO_EXPENSES_PATH}#nova-receita`} className={cn(btnClass, focusRingLight)}>
            <span aria-hidden>＋</span> Adicionar receita
          </Link>
          <Link href={`${FINANCEIRO_EXPENSES_PATH}#nova-despesa`} className={cn(btnClass, focusRingLight)}>
            <span aria-hidden>＋</span> Adicionar despesa
          </Link>
        </div>
      </section>
    );
  }

  if (variant === "prompt_expense") {
    return (
      <section
        className="scroll-mt-24 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 shadow-sm md:p-5"
        aria-labelledby="financeiro-onboarding-next"
      >
        <h2 id="financeiro-onboarding-next" className="text-base font-semibold text-foreground md:text-lg">
          Boa. Agora adicione uma despesa para fechar o básico do mês.
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Com receita e despesa no mês, o painel mostra organização e o que merece atenção.
        </p>
        <Link
          href={`${FINANCEIRO_EXPENSES_PATH}#nova-despesa`}
          className={cn("mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:opacity-90", focusRingLight)}
        >
          <span aria-hidden>＋</span> Adicionar despesa
        </Link>
      </section>
    );
  }

  if (variant === "prompt_income") {
    return (
      <section
        className="scroll-mt-24 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm md:p-5"
        aria-labelledby="financeiro-onboarding-income-first"
      >
        <h2 id="financeiro-onboarding-income-first" className="text-base font-semibold text-foreground md:text-lg">
          Você já tem despesa neste mês. Adicione uma receita para equilibrar a visão.
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          O score e o saldo fazem mais sentido com entrada e saída registradas.
        </p>
        <Link
          href={`${FINANCEIRO_EXPENSES_PATH}#nova-receita`}
          className={cn("mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:opacity-90", focusRingLight)}
        >
          <span aria-hidden>＋</span> Adicionar receita
        </Link>
      </section>
    );
  }

  if (variant === "celebration") {
    return (
      <section
        className="scroll-mt-24 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm md:p-6"
        aria-labelledby="financeiro-onboarding-done"
      >
        <h2 id="financeiro-onboarding-done" className="text-lg font-semibold text-foreground md:text-xl">
          Pronto. Agora você já consegue ver o estado do seu mês.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
          <span className="font-medium text-foreground">Esse número</span> mostra o nível de organização do mês.{" "}
          <span className="font-medium text-foreground">Abaixo</span>, o que precisa de atenção.{" "}
          <span className="font-medium text-foreground">No checklist</span>, as próximas ações para manter tudo em dia.
        </p>
        <button
          type="button"
          onClick={onDismissCelebration}
          className={cn(
            "mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-700/30 bg-white px-5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100/50",
            focusRingLight
          )}
        >
          Entendi, ver meu painel
        </button>
      </section>
    );
  }

  return null;
}
