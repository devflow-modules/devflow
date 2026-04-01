"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { FinanceiroMonthlyTask } from "@/modules/financeiro/routine/types";
import { getMonthlyProgress } from "@/modules/financeiro/routine/getMonthlyProgress";
import {
  trackFinanceiroMobileExpandChecklist,
  trackFinanceiroTaskCompleted,
  trackFinanceiroTaskViewed,
} from "@/lib/analytics";
import { MonthlyProgressBar } from "./MonthlyProgressBar";
import { MonthlyTaskItem } from "./MonthlyTaskItem";
import { MonthlyCompletionState } from "./MonthlyCompletionState";
import { Skeleton } from "@/modules/financeiro/components/Skeleton";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";

type Props = {
  tasks: FinanceiroMonthlyTask[];
  isLoading: boolean;
  onboardingCoachMark?: boolean;
  isDemo?: boolean;
  demoAuthBase?: string;
};

export function MonthlyChecklistPanel({
  tasks,
  isLoading,
  onboardingCoachMark = false,
  isDemo = false,
  demoAuthBase,
}: Props) {
  const viewedRef = useRef<Set<string>>(new Set());
  const initRef = useRef(false);
  const wasCompletedRef = useRef<Record<string, boolean>>({});
  const [checklistExpanded, setChecklistExpanded] = useState(false);

  const progress = getMonthlyProgress(tasks);
  const allDone = tasks.length > 0 && tasks.every((t) => t.completed);

  const previewTaskIds = useMemo(() => {
    const pend = tasks.filter((t) => !t.completed);
    return new Set(pend.slice(0, 2).map((t) => t.id));
  }, [tasks]);

  const hiddenTaskCount = useMemo(() => {
    if (allDone || checklistExpanded) return 0;
    return tasks.filter((t) => !previewTaskIds.has(t.id)).length;
  }, [tasks, previewTaskIds, allDone, checklistExpanded]);

  useEffect(() => {
    if (isDemo || isLoading) return;

    tasks.forEach((t, i) => {
      if (viewedRef.current.has(t.id)) return;
      viewedRef.current.add(t.id);
      trackFinanceiroTaskViewed({
        task_id: t.id,
        completed: t.completed,
        progress: progress.percent,
        position: i,
      });
    });
  }, [isDemo, isLoading, tasks, progress.percent]);

  useEffect(() => {
    if (isDemo || isLoading) return;

    if (!initRef.current) {
      tasks.forEach((t) => {
        wasCompletedRef.current[t.id] = t.completed;
      });
      initRef.current = true;
      return;
    }

    tasks.forEach((t, i) => {
      if (t.completed && !wasCompletedRef.current[t.id]) {
        wasCompletedRef.current[t.id] = true;
        trackFinanceiroTaskCompleted({
          task_id: t.id,
          progress: progress.percent,
          position: i,
        });
        if (!isDemo) {
          if (t.id === "task_categories") {
            toast.success("Categorias organizadas — seus relatórios agora fazem mais sentido", {
              duration: 4500,
            });
          } else {
            toast.success("Passo concluído — você está mais perto de fechar o mês com clareza", {
              duration: 4500,
            });
          }
        }
      }
      if (!t.completed) wasCompletedRef.current[t.id] = false;
    });
  }, [isDemo, isLoading, tasks, progress.percent]);

  if (isLoading) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-5",
          onboardingCoachMark && "ring-2 ring-violet-400/50 ring-offset-2"
        )}
        aria-busy="true"
        id="checklist-mes"
      >
        <Skeleton className="h-3 w-44 md:h-4 md:w-56" />
        <Skeleton className="mt-2 h-1.5 w-full rounded-full md:mt-4 md:h-2" />
        <ul className="mt-3 space-y-2 md:mt-4">
          <Skeleton className="h-[72px] w-full rounded-xl md:h-16" />
          <Skeleton className="h-[72px] w-full rounded-xl md:h-16" />
        </ul>
      </section>
    );
  }

  if (tasks.length === 0) return null;

  return (
    <section
      id="checklist-mes"
      className={cn(
        "scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-5",
        onboardingCoachMark && "ring-2 ring-violet-400/50 ring-offset-2"
      )}
      aria-labelledby="monthly-checklist-heading"
    >
      <div className="mb-2 md:mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 md:text-xs md:tracking-[0.25em]">
          Rotina do mês
        </p>
        <h2 id="monthly-checklist-heading" className="mt-0.5 text-base font-semibold text-foreground md:mt-1 md:text-lg">
          <span className="md:hidden">Próximas ações</span>
          <span className="hidden md:inline">Feche seu mês com calma</span>
        </h2>
        <p className="mt-1 hidden text-sm text-muted-foreground md:block">
          Poucos passos recorrentes — marque ao registrar dados reais no app.
        </p>
      </div>

      <MonthlyProgressBar
        completed={progress.completed}
        total={progress.total}
        percent={progress.percent}
        density="compact"
        className="mb-3 md:mb-4"
      />

      {allDone ? (
        <MonthlyCompletionState className="mb-0 md:mb-4" />
      ) : (
        <>
          <ul className="space-y-2">
            {tasks.map((task, index) => (
              <li
                key={task.id}
                className={cn(!checklistExpanded && !previewTaskIds.has(task.id) && "max-md:hidden")}
              >
                <MonthlyTaskItem
                  task={task}
                  position={index}
                  progressPercent={progress.percent}
                  touchProminent
                  isDemo={isDemo}
                  demoAuthBase={demoAuthBase}
                />
              </li>
            ))}
          </ul>
          {hiddenTaskCount > 0 ? (
            <button
              type="button"
              className={cn(
                "mt-3 hidden min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-foreground hover:bg-slate-100 max-md:flex",
                focusRingLight
              )}
              onClick={() => {
                if (!isDemo)
                  trackFinanceiroMobileExpandChecklist({ hidden_count: hiddenTaskCount });
                setChecklistExpanded(true);
              }}
            >
              Ver tudo ({tasks.length} {tasks.length === 1 ? "passo" : "passos"})
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}