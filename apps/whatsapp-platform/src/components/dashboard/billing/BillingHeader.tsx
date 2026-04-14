"use client";

import { Button } from "@devflow/ui";
import { PLANS, getPlan } from "@/modules/billing/plans";
import { COMMERCIAL_PLAN_HEADLINE, COMMERCIAL_PLAN_SUBTITLE } from "@/modules/billing/planPresentation";

type Props = {
  plan: string;
  status: string;
  hasStripeCustomer: boolean;
  onManageSubscription: () => void;
  manageLoading: boolean;
};

export function BillingHeader({
  plan,
  status,
  hasStripeCustomer,
  onManageSubscription,
  manageLoading,
}: Props) {
  const planDef = getPlan(plan);
  const planName = planDef.name;
  const headline = COMMERCIAL_PLAN_HEADLINE[planDef.key];
  const subtitle = COMMERCIAL_PLAN_SUBTITLE[planDef.key];
  const isPastDue = status?.toLowerCase() === "past_due" || status?.toLowerCase() === "pastdue";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{planName}</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{headline}</h2>
          {subtitle ? <p className="mt-2 max-w-xl text-sm text-slate-600">{subtitle}</p> : null}
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isPastDue
                  ? "bg-red-100 text-red-800"
                  : status?.toLowerCase() === "active"
                    ? "bg-emerald-100 text-emerald-800"
                    : status?.toLowerCase() === "free"
                      ? "bg-slate-100 text-slate-700"
                      : "bg-amber-100 text-amber-800"
              }`}
            >
              {status ?? "—"}
            </span>
          </div>
        </div>
        {hasStripeCustomer && (
          <Button
            type="button"
            variant="outline"
            onClick={onManageSubscription}
            disabled={manageLoading}
          >
            {manageLoading ? "A abrir…" : "Gerir assinatura (Stripe)"}
          </Button>
        )}
      </div>
    </div>
  );
}
