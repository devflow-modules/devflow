"use client";

export function ManagerInsights({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;

  return (
    <div className="rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_50%,var(--df-bg-elevated))] p-5 ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_80%,transparent)]">
      <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--df-text-secondary)]">Insights</h2>
      <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[var(--df-text-primary)]">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--df-brand-500)]" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
