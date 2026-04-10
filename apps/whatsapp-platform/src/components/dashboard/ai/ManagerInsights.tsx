"use client";

export function ManagerInsights({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-5 ring-1 ring-slate-900/[0.04]">
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">Insights</h2>
      <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-800">
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
