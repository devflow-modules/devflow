"use client";

import Link from "next/link";
import type { PlanKey } from "@/modules/billing/plans";
import { freePlanUsageExplainerLines } from "@/modules/billing/usageCommunication";

type Props = {
  planKey: PlanKey;
  className?: string;
};

/**
 * Narrativa de billing só para FREE: limite incluído, sem expansão faturada, CTA para upgrade.
 */
export function HowFreePlanWorksSection({ planKey, className = "" }: Props) {
  const { title, bullets } = freePlanUsageExplainerLines(planKey);

  return (
    <section
      className={`rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 shadow-sm sm:p-6 ${className}`}
      aria-labelledby="how-free-plan-heading"
    >
      <h2 id="how-free-plan-heading" className="text-base font-semibold text-slate-900">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        O plano gratuito permite experimentar a plataforma com um volume incluído por mês — sem cartão e sem cobrança
        variável.
      </p>
      <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
        {bullets.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="mt-0.5 text-emerald-600" aria-hidden>
              ✓
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/dashboard/billing"
          className="inline-flex items-center justify-center rounded-lg bg-[var(--df-brand-600)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--df-brand-700)]"
        >
          Ver planos e continuar
        </Link>
        <Link
          href="/billing"
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          Plano e faturação
        </Link>
      </div>
    </section>
  );
}
