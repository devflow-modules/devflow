"use client";

import { cn } from "@/modules/financeiro/lib/cn";

type Props = {
  completed: number;
  total: number;
  percent: number;
  className?: string;
  /** Barra mais baixa e texto menor (dashboard mobile). */
  density?: "default" | "compact";
};

export function MonthlyProgressBar({ completed, total, percent, className, density = "default" }: Props) {
  if (total === 0) return null;

  const compact = density === "compact";

  return (
    <div className={cn(compact ? "space-y-1" : "space-y-2", className)}>
      <div
        className={cn(
          "flex items-center justify-between text-muted-foreground",
          compact ? "text-[11px]" : "text-xs"
        )}
      >
        <span>
          {completed} / {total} concluídas
        </span>
        <span className="font-semibold text-foreground">{percent}%</span>
      </div>
      <div
        className={cn("overflow-hidden rounded-full bg-slate-200", compact ? "h-1.5" : "h-2")}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progresso da rotina mensal: ${percent} por cento`}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
