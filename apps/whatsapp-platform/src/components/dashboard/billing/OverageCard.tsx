"use client";

type Props = {
  overageMessages: number;
  overageAI: number;
  estimatedCost: number;
};

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function OverageCard({ overageMessages, overageAI, estimatedCost }: Props) {
  const hasOverage = overageMessages > 0 || overageAI > 0;

  if (!hasOverage) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-medium text-slate-600">Excedente do período</h3>
        <p className="mt-2 text-slate-600">Nenhum excedente neste período.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
      <h3 className="text-sm font-medium text-amber-900">Excedente do período</h3>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-amber-800">Mensagens excedentes</dt>
          <dd className="font-mono font-medium text-amber-900">
            {overageMessages.toLocaleString("pt-BR")}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-amber-800">IA excedente</dt>
          <dd className="font-mono font-medium text-amber-900">
            {overageAI.toLocaleString("pt-BR")}
          </dd>
        </div>
        <div className="flex justify-between border-t border-amber-200 pt-2">
          <dt className="font-medium text-amber-900">Custo estimado</dt>
          <dd className="font-semibold text-amber-900">{formatBRL(estimatedCost)}</dd>
        </div>
      </dl>
    </div>
  );
}
