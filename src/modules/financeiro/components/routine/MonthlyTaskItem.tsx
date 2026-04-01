"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import type { FinanceiroMonthlyTask } from "@/modules/financeiro/routine/types";
import { trackFinanceiroTaskClicked } from "@/lib/analytics";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";
import { financeiroAuthWithNext } from "@/modules/financeiro/navigation/authHref";

type Props = {
  task: FinanceiroMonthlyTask;
  position: number;
  progressPercent: number;
  touchProminent?: boolean;
  isDemo?: boolean;
  demoAuthBase?: string;
};

export function MonthlyTaskItem({
  task,
  position,
  progressPercent,
  touchProminent,
  isDemo = false,
  demoAuthBase,
}: Props) {
  const ctaHref = demoAuthBase
    ? financeiroAuthWithNext(task.cta.href, demoAuthBase)
    : task.cta.href;
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
            task.completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"
          )}
          aria-hidden
        >
          {task.completed ? <Check className="size-3.5 stroke-[3]" /> : null}
        </span>
        <p
          className={cn(
            "text-sm font-medium leading-snug text-foreground",
            task.completed && "text-muted-foreground line-through decoration-slate-400"
          )}
        >
          {task.title}
        </p>
      </div>
      {!task.completed ? (
        <Link
          href={ctaHref}
          onClick={() => {
            if (isDemo) return;
            trackFinanceiroTaskClicked({
              task_id: task.id,
              completed: false,
              progress: progressPercent,
              position,
            });
          }}
          className={cn(
            "inline-flex w-full shrink-0 justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white hover:opacity-90 sm:w-auto sm:px-4 sm:text-sm",
            touchProminent ? "min-h-11 px-4 py-3 sm:min-h-0 sm:py-2" : "min-h-11 px-3 py-2.5 sm:min-h-0",
            focusRingLight
          )}
        >
          {task.cta.label}
        </Link>
      ) : null}
    </li>
  );
}
