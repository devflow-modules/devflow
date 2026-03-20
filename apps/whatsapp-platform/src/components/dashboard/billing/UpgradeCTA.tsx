"use client";

import { Button } from "@devflow/ui";
import { PLANS } from "@/modules/billing/plans";
import type { PlanKey } from "@/modules/billing/plans";

type Props = {
  currentPlan: string;
  shouldShow: boolean;
  onUpgrade: (plan: PlanKey) => void;
  loadingPlan: string | null;
};

const PLAN_ORDER: PlanKey[] = ["FREE", "STARTER", "PRO", "SCALE"];

function getNextPlan(current: string): PlanKey {
  const key = (current?.toUpperCase() ?? "FREE") as PlanKey;
  const idx = PLAN_ORDER.indexOf(key);
  const nextIdx = Math.min(idx + 1, PLAN_ORDER.length - 1);
  const next = PLAN_ORDER[nextIdx];
  return next === "FREE" ? "STARTER" : next;
}

export function UpgradeCTA({
  currentPlan,
  shouldShow,
  onUpgrade,
  loadingPlan,
}: Props) {
  if (!shouldShow) return null;

  const nextPlan = getNextPlan(currentPlan);
  const nextPlanDef = PLANS[nextPlan];
  const benefits =
    nextPlan === "STARTER"
      ? "1.000 mensagens, 100 interações IA, automação"
      : nextPlan === "PRO"
        ? "5.000 mensagens, 750 IA, filas e tags, relatórios avançados"
        : "20.000 mensagens, 3.000 IA, suporte prioritário, webhooks";

  return (
    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/60 p-6">
      <h3 className="text-lg font-semibold text-emerald-900">Fazer upgrade</h3>
      <p className="mt-1 text-sm text-emerald-800">
        Benefícios do plano {nextPlanDef.name}: {benefits}
      </p>
      <Button
        type="button"
        className="mt-4 bg-emerald-600 hover:bg-emerald-700"
        onClick={() => onUpgrade(nextPlan)}
        disabled={!!loadingPlan}
      >
        {loadingPlan === nextPlan ? "Redirecionando…" : `Fazer upgrade para ${nextPlanDef.name}`}
      </Button>
    </div>
  );
}
