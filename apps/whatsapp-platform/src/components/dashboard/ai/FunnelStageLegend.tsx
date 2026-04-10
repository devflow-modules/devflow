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
    <details className="group rounded-lg border border-slate-200/90 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
      <summary className="cursor-pointer list-none font-medium text-slate-700 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          Estágios do funil
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-bold text-slate-500"
            title="Legenda do funil comercial"
          >
            ?
          </span>
        </span>
      </summary>
      <ul className="mt-2 space-y-1 border-t border-slate-200/80 pt-2">
        {STAGES.map(([name, desc]) => (
          <li key={name}>
            <span className="font-semibold text-slate-800">{name}</span>
            <span className="text-slate-500"> → {desc}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
