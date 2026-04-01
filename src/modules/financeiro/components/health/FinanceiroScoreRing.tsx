"use client";

import type { HealthScoreLevel } from "@/modules/financeiro/health/types";
import { cn } from "@/modules/financeiro/lib/cn";

const LEVEL_STROKE: Record<HealthScoreLevel, string> = {
  critical: "stroke-rose-500",
  warning: "stroke-amber-500",
  progress: "stroke-sky-600",
  good: "stroke-emerald-600",
};

type Props = {
  score: number;
  level: HealthScoreLevel;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

export function FinanceiroScoreRing({
  score,
  level,
  className,
  size = 88,
  strokeWidth = 8,
}: Props) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * c;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-slate-100"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className={cn("transition-[stroke-dashoffset] duration-500", LEVEL_STROKE[level])}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-bold tabular-nums text-foreground",
            size <= 76 ? "text-lg" : "text-xl"
          )}
        >
          {clamped}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">%</span>
      </div>
    </div>
  );
}
