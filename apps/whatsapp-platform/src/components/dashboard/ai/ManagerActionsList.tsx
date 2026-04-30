"use client";

import Link from "next/link";
import type { ManagerActionItem } from "@/app/dashboard/ai/managerDashboardAi";

export function ManagerActionsList({ actions }: { actions: ManagerActionItem[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-950/35 to-[var(--df-bg-elevated)] p-4 shadow-sm ring-1 ring-amber-500/15">
      <h2 className="text-xs font-bold uppercase tracking-wide text-amber-100">Ações recomendadas</h2>
      <p className="mt-1 text-xs text-amber-200/90">Clique para abrir o inbox com o filtro certo.</p>
      <ul className="mt-3 space-y-2">
        {actions.map((a) => (
          <li key={a.type}>
            <Link
              href={a.action}
              className="group flex items-start gap-2 rounded-lg border border-transparent bg-[color-mix(in_srgb,var(--df-bg-elevated)_88%,transparent)] px-3 py-2.5 text-left text-sm font-medium text-[var(--df-text-primary)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_70%,transparent)] transition hover:border-[var(--df-brand-400)]/40 hover:bg-[var(--df-brand-50)]/50 hover:ring-[var(--df-brand-500)]/25"
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
