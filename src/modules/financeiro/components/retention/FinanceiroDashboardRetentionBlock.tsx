"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { trackFinanceiroReturnNextDay, trackFinanceiroUrgencyViewed } from "@/lib/analytics";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";
import { localDateOnly, localYesterdayOnly } from "@/modules/financeiro/retention/localDateOnly";
import { readLastMovementDate } from "@/modules/financeiro/retention/retentionStorage";
import type { FinanceiroUrgencyPayload } from "@/modules/financeiro/retention/resolveFinanceiroUrgency";
import { FINANCEIRO_EXPENSES_PATH } from "@/modules/financeiro/navigation/constants";

type Props = {
  householdId: string;
  now: Date;
  /** Urgência já resolvida no dashboard (evita duplicar lógica e permite esconder meta diária). */
  urgency: FinanceiroUrgencyPayload | null;
  isLoading: boolean;
};

export function FinanceiroDashboardRetentionBlock({
  householdId,
  now,
  urgency,
  isLoading,
}: Props) {
  const today = useMemo(() => localDateOnly(now), [now]);
  const yesterday = useMemo(() => localYesterdayOnly(now), [now]);

  const showReturnNextDay = useMemo(() => {
    const last = readLastMovementDate(householdId);
    return last === yesterday;
  }, [householdId, yesterday]);

  const urgencyTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading || !urgency) return;
    const key = `${today}:${urgency.kind}`;
    if (urgencyTrackedRef.current === key) return;
    if (typeof sessionStorage !== "undefined") {
      const sk = `financeiro_urgency_tracked_${key}`;
      if (sessionStorage.getItem(sk) === "1") {
        urgencyTrackedRef.current = key;
        return;
      }
      sessionStorage.setItem(sk, "1");
    }
    urgencyTrackedRef.current = key;
    trackFinanceiroUrgencyViewed({
      kind: urgency.kind,
      pending_count: urgency.pendingCount,
    });
  }, [isLoading, urgency, today]);

  useEffect(() => {
    if (!showReturnNextDay || typeof sessionStorage === "undefined") return;
    const k = `financeiro_return_next_day_tracked_${today}`;
    if (sessionStorage.getItem(k) === "1") return;
    sessionStorage.setItem(k, "1");
    trackFinanceiroReturnNextDay({ calendar_day: today });
  }, [showReturnNextDay, today]);

  if (isLoading) return null;

  return (
    <div className="space-y-3">
      {showReturnNextDay ? (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-emerald-950 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p className="text-sm font-medium leading-snug">
            Ontem você organizou seu financeiro. Vamos continuar?
          </p>
          <Link
            href={`${FINANCEIRO_EXPENSES_PATH}#nova-despesa`}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900",
              focusRingLight
            )}
          >
            Continuar
          </Link>
        </div>
      ) : null}

      {urgency ? (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p className="text-sm font-medium leading-snug">{urgency.message}</p>
          <Link
            href={urgency.ctaHref}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:opacity-90",
              focusRingLight
            )}
          >
            {urgency.ctaLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
