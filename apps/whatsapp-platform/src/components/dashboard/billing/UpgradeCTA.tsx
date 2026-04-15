"use client";

import { Button } from "@devflow/ui";
import { PLANS, normalizePlan } from "@/modules/billing/plans";
import type { PlanKey } from "@/modules/billing/plans";
import {
  COMMERCIAL_PLAN_HEADLINE,
  COMMERCIAL_PLAN_SUBTITLE,
  upgradeCtaHeadline,
} from "@/modules/billing/planPresentation";

type Props = {
  currentPlan: string;
  shouldShow: boolean;
  onUpgrade: (plan: PlanKey) => void;
  loadingPlan: string | null;
  /** Para atalhos no cabeçalho (ex.: “Atualizar plano”). */
  upgradeButtonId?: string;
};

function getNextPlan(current: string): PlanKey {
  const key = normalizePlan(current);
  return key === "FREE" ? "OPERATIONAL_BASE" : "OPERATIONAL_BASE";
}

export function UpgradeCTA({
  currentPlan,
  shouldShow,
  onUpgrade,
  loadingPlan,
  upgradeButtonId,
}: Props) {
  if (!shouldShow) return null;

  const currentKey = normalizePlan(currentPlan);
  const nextPlan = getNextPlan(currentPlan);
  const nextPlanDef = PLANS[nextPlan];

  return (
    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/60 p-6">
      <h3 className="text-lg font-semibold text-emerald-900">{upgradeCtaHeadline(currentKey, nextPlan)}</h3>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-800/90">{nextPlanDef.name}</p>
      <p className="mt-1 text-base font-semibold text-emerald-950">{COMMERCIAL_PLAN_HEADLINE[nextPlan]}</p>
      <p className="mt-2 text-sm leading-relaxed text-emerald-900/95">{COMMERCIAL_PLAN_SUBTITLE[nextPlan]}</p>
      <Button
        id={upgradeButtonId}
        type="button"
        className="mt-4 bg-emerald-600 hover:bg-emerald-700"
        onClick={() => onUpgrade(nextPlan)}
        disabled={!!loadingPlan}
      >
        {loadingPlan === nextPlan ? "A redirecionar…" : `Continuar com o plano ${nextPlanDef.name}`}
      </Button>
    </div>
  );
}
