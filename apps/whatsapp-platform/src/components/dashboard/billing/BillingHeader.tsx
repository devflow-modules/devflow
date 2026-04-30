"use client";

import { Button } from "@/components/ui/button";
import { getPlan } from "@/modules/billing/plans";
import {
  BILLING_HEADER_SUPPORTING_LINE,
  COMMERCIAL_PLAN_HEADLINE,
  COMMERCIAL_PLAN_SUBTITLE,
} from "@/modules/billing/planPresentation";

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
    <div className="rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">{planName}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--df-text-muted)]">{BILLING_HEADER_SUPPORTING_LINE}</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--df-text-primary)]">{headline}</h2>
          {subtitle ? <p className="mt-2 max-w-xl text-sm text-[var(--df-text-secondary)]">{subtitle}</p> : null}
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isPastDue
                  ? "df-badge-error !normal-case"
                  : status?.toLowerCase() === "active"
                    ? "df-badge-success !normal-case"
                    : status?.toLowerCase() === "free"
                      ? "bg-[var(--df-bg-app)] text-[var(--df-text-secondary)]"
                      : "df-badge-warning !normal-case"
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
