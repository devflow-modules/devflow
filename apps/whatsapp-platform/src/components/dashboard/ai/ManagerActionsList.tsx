"use client";

import Link from "next/link";
import type { ManagerActionItem } from "@/app/dashboard/ai/managerDashboardAi";

export function ManagerActionsList({ actions }: { actions: ManagerActionItem[] }) {
  if (actions.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-[color:rgb(245_158_11/0.35)] bg-[linear-gradient(to_bottom_right,rgb(245_158_11/0.14),var(--df-bg-elevated))] p-4 shadow-sm ring-1 ring-[color:rgb(245_158_11/0.2)]"
      role="region"
      aria-label="Ações recomendadas"
    >
      <h2 className="df-text-warning text-xs font-bold uppercase tracking-wide">Ações recomendadas</h2>
      <p className="mt-1 text-xs df-text-secondary">Clique para abrir o inbox com o filtro certo.</p>
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
