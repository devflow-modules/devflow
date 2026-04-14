"use client";

import { STRIPE_USAGE_LINE_LABELS } from "@/modules/billing/usageCommunication";

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
        <h3 className="text-sm font-medium text-slate-600">Expansão de uso (além do incluído)</h3>
        <p className="mt-2 text-sm text-slate-600">
          Neste período ainda não ultrapassou o pacote incluído no plano — sem uso adicional a registar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm">
      <h3 className="text-sm font-medium text-emerald-950">Uso adicional (expansão)</h3>
      <p className="mt-1 text-xs text-emerald-900/80">
        Volume além do incluído no plano — faturado de forma transparente, com os mesmos nomes na fatura Stripe.
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-emerald-900/90">{STRIPE_USAGE_LINE_LABELS.extraConversations}</dt>
          <dd className="tabular-nums font-medium text-emerald-950">
            {overageMessages.toLocaleString("pt-BR")}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-emerald-900/90">{STRIPE_USAGE_LINE_LABELS.extraAi}</dt>
          <dd className="tabular-nums font-medium text-emerald-950">{overageAI.toLocaleString("pt-BR")}</dd>
        </div>
        <div className="flex justify-between border-t border-emerald-200/80 pt-2">
          <dt className="font-medium text-emerald-950">Estimativa no período</dt>
          <dd className="font-semibold text-emerald-950">{formatBRL(estimatedCost)}</dd>
        </div>
      </dl>
    </div>
  );
}
