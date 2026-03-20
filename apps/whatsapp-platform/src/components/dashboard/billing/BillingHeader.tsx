"use client";

import { Button } from "@devflow/ui";
import { PLANS } from "@/modules/billing/plans";

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
  const planKey = plan?.toUpperCase() ?? "FREE";
  const planDef = PLANS[planKey as keyof typeof PLANS] ?? PLANS.FREE;
  const planName = planDef.name;
  const isPastDue = status?.toLowerCase() === "past_due" || status?.toLowerCase() === "pastdue";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{planName}</h2>
          <div className="mt-1 flex items-center gap-2">
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
            {manageLoading ? "Abrindo…" : "Gerenciar assinatura"}
          </Button>
        )}
      </div>
    </div>
  );
}
