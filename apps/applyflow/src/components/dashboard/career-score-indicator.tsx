import { cn } from "@/lib/cn";
import type { CareerPilotScoreItem } from "./career-pilot-result-mapper";

export function scoreQualitativeLabel(value: number, max = 100): string {
  const pct = max > 0 ? (value / max) * 100 : 0;
  if (pct < 40) {
    return "Baixa aderência";
  }
  if (pct < 70) {
    return "Aderência parcial";
  }
  return "Boa aderência";
}

export function CareerScoreIndicator({ score }: { score: CareerPilotScoreItem }) {
  const max = score.max ?? 100;
  const pct = Math.min(100, Math.max(0, Math.round((score.value / max) * 100)));
  const qualitative = scoreQualitativeLabel(score.value, max);
  const ariaLabel = `${score.label}: ${score.value} de ${max}. ${qualitative}.`;

  return (
    <div
      className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] p-4"
      data-testid="career-pilot-score-indicator"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm font-medium text-[color:var(--af-text)]">{score.label}</p>
        <p className="text-sm text-[color:var(--af-text-muted)]" aria-hidden>
          {qualitative}
        </p>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div
          className="relative h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--af-surface)]"
          role="progressbar"
          aria-valuenow={score.value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={ariaLabel}
        >
          <div
            className={cn(
              "h-full rounded-full bg-emerald-500/70",
              pct < 40 && "bg-amber-500/70",
              pct >= 70 && "bg-emerald-400/80",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-lg font-semibold tabular-nums text-[color:var(--af-text)]">
          <span className="sr-only">{ariaLabel}</span>
          <span aria-hidden>
            {score.value}
            <span className="text-sm font-normal text-[color:var(--af-text-muted)]">/{max}</span>
          </span>
        </p>
      </div>
    </div>
  );
}
