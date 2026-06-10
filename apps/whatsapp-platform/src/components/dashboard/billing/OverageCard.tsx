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
      <div className="df-metric-card">
        <h3 className="text-sm font-medium text-[var(--df-text-secondary)]">Expansão de uso (além do incluído)</h3>
        <p className="mt-2 text-sm text-[var(--df-text-secondary)]">Ainda dentro do volume incluído no contrato.</p>
      </div>
    );
  }

  return (
    <div className="df-metric-card df-metric-subcard--warning !p-5">
      <h3 className="text-sm font-medium df-text-warning">Uso adicional (expansão)</h3>
      <p className="mt-1 text-xs text-[var(--df-text-secondary)]">
        Volume além do incluído no contrato — consolidado de forma transparente no extrato do período.
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--df-text-secondary)]">{STRIPE_USAGE_LINE_LABELS.extraConversations}</dt>
          <dd className="tabular-nums font-medium text-[var(--df-text-primary)]">
            {overageMessages.toLocaleString("pt-BR")}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--df-text-secondary)]">{STRIPE_USAGE_LINE_LABELS.extraAi}</dt>
          <dd className="tabular-nums font-medium text-[var(--df-text-primary)]">{overageAI.toLocaleString("pt-BR")}</dd>
        </div>
        <div className="flex justify-between border-t df-border-brand pt-2">
          <dt className="font-medium text-[var(--df-text-primary)]">Estimativa no período</dt>
          <dd className="font-semibold text-[var(--df-text-primary)]">{formatBRL(estimatedCost)}</dd>
        </div>
      </dl>
    </div>
  );
}
