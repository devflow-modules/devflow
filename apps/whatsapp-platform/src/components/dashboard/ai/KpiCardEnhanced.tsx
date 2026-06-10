"use client";

export function KpiCardEnhanced({
  label,
  value,
  hint,
  subHint,
  emphasis,
  tooltip,
}: {
  label: string;
  value: string | number;
  hint?: string;
  /** Subtítulo contextual (ex.: pendências) */
  subHint?: string;
  emphasis?: boolean;
  /** Texto para tooltip nativo (acessível) */
  tooltip?: string;
}) {
  return (
    <div
      className="df-metric-card"
      title={tooltip}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">{label}</p>
      <p
        className={`mt-2 tabular-nums text-[var(--df-text-primary)] ${emphasis ? "text-3xl font-bold" : "text-2xl font-bold"}`}
      >
        {value}
      </p>
      {subHint ? <p className="mt-1 text-xs font-medium text-[var(--df-text-secondary)]">{subHint}</p> : null}
      {hint ? <p className="mt-1 text-xs text-[var(--df-text-muted)]">{hint}</p> : null}
    </div>
  );
}
