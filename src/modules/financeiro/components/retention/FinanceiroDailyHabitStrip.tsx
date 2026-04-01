"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import {
  trackFinanceiroDailyGoalCompleted,
  trackFinanceiroDailyGoalViewed,
} from "@/lib/analytics";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";
import { FINANCEIRO_EXPENSES_PATH } from "@/modules/financeiro/navigation/constants";
import { localDateOnly } from "@/modules/financeiro/retention/localDateOnly";
import { hasFinanceiroMovementToday } from "@/modules/financeiro/retention/resolveFinanceiroUrgency";

type Props = {
  now: Date;
  incomes: { receivedAt?: string | null }[];
  expenses: { dueDate?: string | null }[];
  isLoading: boolean;
};

export function FinanceiroDailyHabitStrip({ now, incomes, expenses, isLoading }: Props) {
  const today = useMemo(() => localDateOnly(now), [now]);
  const movementToday = useMemo(
    () => hasFinanceiroMovementToday(now, incomes, expenses),
    [now, incomes, expenses]
  );

  const dailyViewTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading) return;
    const key = `financeiro_daily_goal_view_${today}`;
    if (dailyViewTrackedRef.current === key) return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key) === "1") {
      dailyViewTrackedRef.current = key;
      return;
    }
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(key, "1");
    dailyViewTrackedRef.current = key;
    trackFinanceiroDailyGoalViewed({ completed: movementToday, calendar_day: today });
  }, [isLoading, movementToday, today]);

  const dailyDoneTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading || !movementToday) return;
    const key = `financeiro_daily_goal_done_${today}`;
    if (dailyDoneTrackedRef.current === key) return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key) === "1") {
      dailyDoneTrackedRef.current = key;
      return;
    }
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(key, "1");
    dailyDoneTrackedRef.current = key;
    trackFinanceiroDailyGoalCompleted({ calendar_day: today });
  }, [isLoading, movementToday, today]);

  if (isLoading) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Meta de hoje</p>
      <p className="mt-1 text-sm font-medium text-foreground">Registrar pelo menos 1 movimentação</p>
      <p className={cn("mt-1 text-sm", movementToday ? "text-emerald-700" : "text-muted-foreground")}>
        {movementToday ? "✔️ Hoje já está atualizado" : "Você ainda não registrou nada hoje"}
      </p>
      {!movementToday ? (
        <Link
          href={`${FINANCEIRO_EXPENSES_PATH}#nova-receita`}
          className={cn(
            "mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90",
            focusRingLight
          )}
        >
          Registrar agora
        </Link>
      ) : null}
    </div>
  );
}
