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
      className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]"
      title={tooltip}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-2 tabular-nums text-slate-900 ${emphasis ? "text-3xl font-bold" : "text-2xl font-bold"}`}
      >
        {value}
      </p>
      {subHint ? <p className="mt-1 text-xs font-medium text-slate-600">{subHint}</p> : null}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
