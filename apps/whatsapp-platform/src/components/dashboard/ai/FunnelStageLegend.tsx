"use client";

const STAGES = [
  ["Lead", "primeiro contacto"],
  ["Qualifying", "entender necessidade"],
  ["Negotiating", "tentar fechar"],
  ["Closed", "venda concluída"],
  ["Support", "atendimento"],
] as const;

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
        {STAGES.map(([name, desc]) => (
          <li key={name}>
            <span className="font-semibold text-[var(--df-text-primary)]">{name}</span>
            <span className="text-[var(--df-text-muted)]"> → {desc}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
