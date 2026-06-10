"use client";

import Link from "next/link";
import type { PlanKey } from "@/modules/billing/plans";
import { freePlanUsageExplainerLines } from "@/modules/billing/usageCommunication";

type Props = {
  planKey: PlanKey;
  className?: string;
};

/**
 * Narrativa de billing só para conta em avaliação (FREE): limites incluídos, sem expansão faturada.
 */
export function HowFreePlanWorksSection({ planKey, className = "" }: Props) {
  const { title, bullets } = freePlanUsageExplainerLines(planKey);

  return (
    <section
      className={`rounded-2xl border df-border-brand bg-gradient-to-b from-[var(--df-bg-app)] to-[var(--df-bg-elevated)] p-5 shadow-sm sm:p-6 ${className}`}
      aria-labelledby="how-free-plan-heading"
    >
      <h2 id="how-free-plan-heading" className="text-base font-semibold text-[var(--df-text-primary)]">
        {title}
      </h2>
      <p className="mt-1 text-sm text-[var(--df-text-secondary)]">
        A avaliação permite experimentar a plataforma com um volume incluído por mês — sem cartão e sem cobrança
        variável. Para operação completa, combinamos implantação e contrato consigo.
      </p>
      <ul className="mt-4 space-y-2.5 text-sm text-[var(--df-text-secondary)]">
        {bullets.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="mt-0.5 df-list-check-success" aria-hidden>
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
          Contrato e uso
        </Link>
        <Link
          href="/billing"
          className="inline-flex items-center justify-center rounded-lg border df-border-brand bg-[var(--df-bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--df-text-primary)] shadow-sm transition hover:bg-[color-mix(in_srgb,var(--df-bg-app)_45%,var(--df-bg-elevated))]"
        >
          Ver consumo
        </Link>
      </div>
    </section>
  );
}
