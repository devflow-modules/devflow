"use client";

import { Fragment } from "react";
import { PLANS, getPlan } from "@/modules/billing/plans";
import type { PlanKey } from "@/modules/billing/plans";
import {
  COMMERCIAL_PLAN_HEADLINE,
  COMMERCIAL_PLAN_SUBTITLE,
  COMMERCIAL_RECOMMENDED_BADGE,
  COMMERCIAL_RECOMMENDED_PLAN,
  PLAN_VALUE_COMPARISON,
  PRICING_DECISION_REASSURANCE,
  PRICING_LIMITS_SECTION_TITLE,
  comparisonCellValue,
  formatIncludedLimitsLine,
} from "@/modules/billing/planPresentation";

const COLUMNS: PlanKey[] = ["FREE", "OPERATIONAL_BASE"];

type Props = {
  /** Plano atual do tenant (para contexto; opcional). */
  currentPlan?: string | null;
};

export function PlanComparisonMatrix({ currentPlan }: Props) {
  const currentKey = getPlan(currentPlan).key;

  return (
    <section
      className="rounded-2xl border df-border-brand bg-[var(--df-bg-elevated)] p-5 shadow-sm"
      aria-labelledby="plan-comparison-heading"
    >
      <div className="mb-4">
        <h2 id="plan-comparison-heading" className="text-lg font-semibold text-[var(--df-text-primary)]">
          Avaliação vs operação contratada
        </h2>
        <p className="mt-1 text-sm text-[var(--df-text-secondary)]">
          A operação comercial é consultiva: o pacote incluído e os limites alinham-se ao contrato de implantação. A
          tabela resume a diferença entre experimentar e operar em produção.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border df-border-brand">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_55%,var(--df-bg-elevated))] align-top">
              <th className="px-3 py-3 font-medium text-[var(--df-text-secondary)] sm:px-4">Âmbito</th>
              {COLUMNS.map((key) => {
                const isPro = key === COMMERCIAL_RECOMMENDED_PLAN;
                const isCurrent = key === currentKey;
                return (
                  <th
                    key={key}
                    scope="col"
                    className={`px-3 py-3 font-semibold text-[var(--df-text-primary)] sm:px-4 ${
                      isPro
                        ? "relative z-[1] border-x-2 border-amber-300 bg-gradient-to-b from-amber-50/90 to-amber-50/40 shadow-[0_4px_24px_-4px_rgba(245,158,11,0.35)]"
                        : ""
                    } ${isCurrent ? "ring-1 ring-[var(--df-brand-400)]/40" : ""}`}
                  >
                    <span className="flex flex-col gap-1.5 text-left">
                      <span className="text-[11px] font-normal uppercase tracking-wide text-[var(--df-text-muted)]">
                        {PLANS[key].name}
                      </span>
                      <span className={`text-sm font-semibold leading-snug ${isPro ? "text-amber-950" : ""}`}>
                        {COMMERCIAL_PLAN_HEADLINE[key]}
                      </span>
                      {isPro ? (
                        <span className="w-fit rounded-full bg-amber-200/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                          {COMMERCIAL_RECOMMENDED_BADGE}
                        </span>
                      ) : null}
                      {isCurrent ? (
                        <span className="w-fit rounded-full bg-[color-mix(in_srgb,var(--df-border-dark)_55%,var(--df-bg-elevated))] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--df-text-primary)]">
                          O seu plano
                        </span>
                      ) : null}
                      <span className="text-xs font-normal leading-relaxed text-[var(--df-text-secondary)]">
                        {COMMERCIAL_PLAN_SUBTITLE[key]}
                      </span>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {PLAN_VALUE_COMPARISON.map((section) => (
              <Fragment key={section.axis}>
                <tr className="bg-[color-mix(in_srgb,var(--df-bg-app)_58%,var(--df-bg-elevated))]">
                  <td
                    colSpan={3}
                    className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--df-text-secondary)] sm:px-4"
                  >
                    {section.title}
                  </td>
                </tr>
                {section.rows.map((row) => (
                  <tr key={`${section.axis}-${row.label}`} className="border-b df-border-brand last:border-0">
                    <th
                      scope="row"
                      className="max-w-[200px] px-3 py-2.5 font-normal text-[var(--df-text-secondary)] sm:px-4"
                    >
                      {row.label}
                    </th>
                    {COLUMNS.map((plan) => {
                      const isPro = plan === COMMERCIAL_RECOMMENDED_PLAN;
                      return (
                        <td
                          key={plan}
                          className={`px-3 py-2.5 text-[var(--df-text-primary)] sm:px-4 ${
                            isPro
                              ? "border-x-2 border-amber-200/90 bg-amber-50/25"
                              : ""
                          }`}
                        >
                          {comparisonCellValue(row, plan)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_50%,var(--df-bg-elevated))]">
              <th
                scope="row"
                className="px-3 py-3 text-left text-xs font-semibold text-[var(--df-text-muted)] sm:px-4"
              >
                {PRICING_LIMITS_SECTION_TITLE}
              </th>
              {COLUMNS.map((plan) => {
                const isPro = plan === COMMERCIAL_RECOMMENDED_PLAN;
                return (
                  <td
                    key={plan}
                    className={`px-3 py-3 text-xs leading-relaxed text-[var(--df-text-muted)] sm:px-4 ${
                      isPro ? "border-x-2 border-amber-200/80 bg-amber-50/20" : ""
                    }`}
                  >
                    {formatIncludedLimitsLine(plan)}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-4 text-center text-sm leading-relaxed text-[var(--df-text-secondary)]">{PRICING_DECISION_REASSURANCE}</p>
    </section>
  );
}
