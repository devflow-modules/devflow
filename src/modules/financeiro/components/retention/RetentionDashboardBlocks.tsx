"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  trackFinanceiroDailyGoalCompleted,
  trackFinanceiroDailyGoalViewed,
  trackFinanceiroReturnNextDay,
  trackFinanceiroUrgencyViewed,
} from "@/lib/analytics";
import { computeRetentionUrgency, hasMovementOnCalendarDay } from "@/modules/financeiro/retention/computeRetentionUrgency";
import { getMonthEmotionalSentence } from "@/modules/financeiro/retention/monthEmotionalLabel";
import {
  calendarDayFromDate,
  markDailyGoalCompletedTracked,
  markReturnNextDayBannerShown,
  shouldShowReturnNextDayBanner,
  shouldTrackDailyGoalCompleted,
} from "@/modules/financeiro/retention/retentionStorage";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";

type IncomeLike = { receivedAt?: string | null };
type ExpenseLike = { dueDate?: string | null };

type Props = {
  householdId: string;
  score: number;
  incomes: IncomeLike[];
  expenses: ExpenseLike[];
  pendingChecklistCount: number;
  isLoading: boolean;
};

export function RetentionDashboardBlocks({
  householdId,
  score,
  incomes,
  expenses,
  pendingChecklistCount,
  isLoading,
}: Props) {
  const now = useMemo(() => new Date(), []);
  const urgency = useMemo(
    () =>
      isLoading
        ? null
        : computeRetentionUrgency(incomes, expenses, pendingChecklistCount, now),
    [isLoading, incomes, expenses, pendingChecklistCount, now]
  );

  const todayIso = useMemo(() => calendarDayFromDate(now), [now]);
  const hasEntryToday = useMemo(
    () => hasMovementOnCalendarDay(incomes, expenses, todayIso),
    [incomes, expenses, todayIso]
  );

  const qualifiesReturn = useMemo(
    () => shouldShowReturnNextDayBanner(householdId, now),
    [householdId, now]
  );
  const [returnBannerDismissed, setReturnBannerDismissed] = useState(false);
  const showReturn = !isLoading && qualifiesReturn && !returnBannerDismissed;

  const urgencyLogged = useRef<string | null>(null);
  useEffect(() => {
    if (!urgency || isLoading) return;
    const key = `${urgency.kind}-${urgency.pendingCount ?? 0}`;
    if (urgencyLogged.current === key) return;
    urgencyLogged.current = key;
    trackFinanceiroUrgencyViewed({
      kind: urgency.kind,
      pending_count: urgency.pendingCount,
    });
  }, [urgency, isLoading]);

  const dailyViewLogged = useRef(false);
  useEffect(() => {
    if (isLoading) return;
    if (dailyViewLogged.current) return;
    dailyViewLogged.current = true;
    trackFinanceiroDailyGoalViewed({ completed: hasEntryToday, calendar_day: todayIso });
  }, [isLoading, hasEntryToday]);

  const dailyCompletedLogged = useRef(false);
  useEffect(() => {
    if (isLoading || !hasEntryToday) return;
    if (dailyCompletedLogged.current) return;
    if (!shouldTrackDailyGoalCompleted(householdId, now)) return;
    dailyCompletedLogged.current = true;
    markDailyGoalCompletedTracked(householdId, now);
    trackFinanceiroDailyGoalCompleted({ calendar_day: calendarDayFromDate(now) });
  }, [isLoading, hasEntryToday, householdId, now]);

  const returnLogged = useRef(false);
  useEffect(() => {
    if (!showReturn || returnLogged.current) return;
    returnLogged.current = true;
    trackFinanceiroReturnNextDay({ calendar_day: calendarDayFromDate(now) });
  }, [showReturn]);

  if (isLoading) return null;

  const emotional = getMonthEmotionalSentence(score);

  return (
    <div className="space-y-3 md:space-y-4">
      {showReturn ? (
        <ReturnNextDayCard
          onContinue={() => {
            markReturnNextDayBannerShown(householdId, now);
            setReturnBannerDismissed(true);
          }}
        />
      ) : null}

      <p className="text-center text-sm font-medium text-muted-foreground md:text-left md:text-base">
        {emotional}
      </p>

      {urgency ? (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between",
            urgency.kind === "stale" && "border-amber-200 bg-amber-50/90",
            urgency.kind === "today_missing" && "border-sky-200 bg-sky-50/80",
            urgency.kind === "incomplete" && "border-violet-200 bg-violet-50/70"
          )}
          role="status"
        >
          <p className="text-sm font-medium text-foreground">{urgency.message}</p>
          <Link
            href={urgency.ctaHref}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:opacity-90 sm:min-h-10",
              focusRingLight
            )}
          >
            {urgency.ctaLabel}
          </Link>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:px-5 md:py-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 md:text-xs">
          Meta de hoje
        </p>
        <p className="mt-1 text-sm font-medium text-foreground md:text-base">
          Registrar pelo menos 1 movimentação
        </p>
        <p className="mt-1 text-xs text-muted-foreground md:text-sm">
          {hasEntryToday ? (
            <span className="text-emerald-700">
              <span aria-hidden>✔️ </span>Hoje já está atualizado
            </span>
          ) : (
            "Você ainda não registrou nada hoje"
          )}
        </p>
      </div>
    </div>
  );
}

function ReturnNextDayCard({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-emerald-950">
        Ontem você organizou seu financeiro. Vamos continuar?
      </p>
      <Link
        href="/ferramentas/financeiro/expenses#nova-despesa"
        onClick={() => onContinue()}
        className={cn(
          "inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900",
          focusRingLight
        )}
      >
        Continuar
      </Link>
    </div>
  );
}
