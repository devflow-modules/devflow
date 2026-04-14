"use client";

import Link from "next/link";
import type { FeatureNotAvailablePayload as FeatureBlockedApiPayload } from "@/lib/protected-fetch";
import { PLANS, type PlanKey } from "@/modules/billing/plans";

type Props = {
  blocked: Pick<FeatureBlockedApiPayload, "feature" | "currentPlan" | "requiredPlan" | "message">;
  onDismiss?: () => void;
  billingHref?: string;
};

function planLabel(key: string): string {
  const k = key as PlanKey;
  return PLANS[k]?.name ?? key;
}

/**
 * Banner leve quando a API devolve FEATURE_NOT_AVAILABLE — CTA para billing.
 */
export function FeatureUpgradePrompt({
  blocked,
  onDismiss,
  billingHref = "/dashboard/billing",
}: Props) {
  const msg =
    blocked.message?.trim() ||
    `Para usar esta funcionalidade, faça upgrade para o plano ${planLabel(blocked.requiredPlan)}.`;

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      data-testid="feature-upgrade-prompt"
    >
      <p className="min-w-0 leading-relaxed">{msg}</p>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-amber-900/80 hover:bg-amber-100/80"
          >
            Fechar
          </button>
        ) : null}
        <Link
          href={billingHref}
          className="inline-flex items-center justify-center rounded-lg bg-[var(--df-brand-600)] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--df-brand-700)]"
        >
          Ver planos
        </Link>
      </div>
    </div>
  );
}
