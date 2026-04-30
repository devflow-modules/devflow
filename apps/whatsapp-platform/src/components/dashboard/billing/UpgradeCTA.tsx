"use client";

import { Button } from "@/components/ui/button";
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
    <div className="df-feedback-success rounded-xl p-6">
      <h3 className="text-lg font-semibold">{upgradeCtaHeadline(currentKey, nextPlan)}</h3>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-90">{nextPlanDef.name}</p>
      <p className="mt-1 text-base font-semibold">{COMMERCIAL_PLAN_HEADLINE[nextPlan]}</p>
      <p className="mt-2 text-sm leading-relaxed opacity-95">{COMMERCIAL_PLAN_SUBTITLE[nextPlan]}</p>
      <Button
        variant="primary"
        id={upgradeButtonId}
        type="button"
        className="mt-4"
        onClick={() => onUpgrade(nextPlan)}
        disabled={!!loadingPlan}
      >
        {loadingPlan === nextPlan ? "A redirecionar…" : `Continuar com o plano ${nextPlanDef.name}`}
      </Button>
    </div>
  );
}
