"use client";

import Link from "next/link";
import type { ManagerActionItem } from "@/app/dashboard/ai/managerDashboardAi";

export function ManagerActionsList({ actions }: { actions: ManagerActionItem[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-4 shadow-sm ring-1 ring-amber-900/[0.06]">
      <h2 className="text-xs font-bold uppercase tracking-wide text-amber-900/90">Ações recomendadas</h2>
      <p className="mt-1 text-xs text-amber-900/70">Clique para abrir o inbox com o filtro certo.</p>
      <ul className="mt-3 space-y-2">
        {actions.map((a) => (
          <li key={a.type}>
            <Link
              href={a.action}
              className="group flex items-start gap-2 rounded-lg border border-transparent bg-white/80 px-3 py-2.5 text-left text-sm font-medium text-slate-900 shadow-sm ring-1 ring-slate-200/80 transition hover:border-[var(--df-brand-400)]/40 hover:bg-[var(--df-brand-50)]/50 hover:ring-[var(--df-brand-500)]/25"
            >
              <span className="min-w-0 flex-1 leading-snug">{a.label}</span>
              <span
                className="shrink-0 text-[var(--df-brand-600)] opacity-0 transition group-hover:opacity-100"
                aria-hidden
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
