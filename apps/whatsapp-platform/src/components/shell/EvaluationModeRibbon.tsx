"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchProtected } from "@/lib/protected-fetch";
import type { TenantBillingUI } from "@/modules/billing";
import {
  evaluationModeBadgeLabel,
  freeEvaluationStaleMessage,
  isFreeEvaluationPlan,
} from "@/modules/billing/demoEvaluation";
import { isWhiteLabelMode } from "@/lib/productMode";

type Props = {
  className?: string;
};

/**
 * Faixa discreta quando o tenant está em FREE — narrativa de avaliação guiada (sem bloquear).
 */
export function EvaluationModeRibbon({ className = "" }: Props) {
  const { data } = useQuery({
    queryKey: ["tenant-billing-ui"],
    queryFn: async (): Promise<TenantBillingUI | null> => {
      const r = await fetchProtected("/api/billing/ui");
      if (!r.ok) return null;
      const j = (await r.json()) as { data?: TenantBillingUI };
      return j.data ?? null;
    },
    staleTime: 120_000,
    enabled: !isWhiteLabelMode(),
  });

  if (isWhiteLabelMode()) return null;
  if (!data || !isFreeEvaluationPlan(data.plan)) return null;

  const label = evaluationModeBadgeLabel(data.plan);
  const stale = freeEvaluationStaleMessage(data.plan, data.tenantCreatedAt);

  return (
    <div
      data-testid="evaluation-mode-ribbon"
      role="status"
      className={`shrink-0 border-b border-sky-100/90 bg-sky-50/95 px-3 py-2 text-center text-[11px] leading-snug text-sky-950 sm:px-4 sm:text-left ${className}`.trim()}
    >
      <span className="font-semibold tracking-tight">{label}</span>
      {stale ? (
        <span className="mt-0.5 block text-sky-900/95 sm:mt-0 sm:ml-2 sm:inline">{stale}</span>
      ) : null}
      <Link
        href="/dashboard/billing"
        className="mt-1 block font-semibold text-[var(--df-brand-700)] underline-offset-2 hover:underline sm:mt-0 sm:ml-3 sm:inline"
      >
        Contrato e uso →
      </Link>
    </div>
  );
}
