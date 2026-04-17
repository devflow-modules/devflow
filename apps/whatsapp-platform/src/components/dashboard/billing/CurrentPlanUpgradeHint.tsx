"use client";

import Link from "next/link";
import { isWhiteLabelMode } from "@/lib/productMode";
import { PLANS, getPlan } from "@/modules/billing/plans";
import { upgradeSuggestionCopy } from "@/modules/billing/planPresentation";

type Props = {
  plan: string;
};

export function CurrentPlanUpgradeHint({ plan }: Props) {
  if (isWhiteLabelMode()) return null;
  const key = getPlan(plan).key;
  const def = PLANS[key];
  const hint = upgradeSuggestionCopy(key);

  return (
    <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 to-white px-4 py-3 shadow-sm">
      <p className="text-sm text-slate-800">
        Está no plano <strong>{def.name}</strong>.
      </p>
      {hint ? (
        <p className="mt-2 text-sm text-slate-700">
          <Link href={hint.href} className="font-semibold text-[var(--df-brand-700)] hover:underline">
            {hint.title}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
