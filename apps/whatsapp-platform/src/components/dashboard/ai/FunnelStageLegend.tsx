"use client";

import { DASHBOARD_AI_FUNNEL_STAGES } from "@/app/dashboard/ai/dashboardAiFunnelCopy";

export function FunnelStageLegend() {
  return (
    <details className="group rounded-lg border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_52%,var(--df-bg-elevated))] px-3 py-2 text-xs text-[var(--df-text-secondary)]">
      <summary className="cursor-pointer list-none font-medium text-[var(--df-text-secondary)] [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          Estágios do funil
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--df-border-dark)_85%,var(--df-border-subtle))] bg-[var(--df-bg-elevated)] text-[11px] font-bold text-[var(--df-text-muted)]"
            title="Legenda do funil comercial"
          >
            ?
          </span>
        </span>
      </summary>
      <ul className="mt-2 space-y-1 border-t df-border-brand pt-2">
        {DASHBOARD_AI_FUNNEL_STAGES.map(({ label, description }) => (
          <li key={label}>
            <span className="font-semibold text-[var(--df-text-primary)]">{label}</span>
            <span className="text-[var(--df-text-muted)]"> → {description}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
