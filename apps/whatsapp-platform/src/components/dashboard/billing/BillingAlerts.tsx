"use client";

import { STRIPE_USAGE_LINE_LABELS } from "@/modules/billing/usageCommunication";

type Props = {
  usagePercentageMessages: number | null;
  usagePercentageAI: number | null;
  enforceLimits: boolean;
  overageMessages: number;
  overageAI: number;
};

type Alert = {
  type: "warning" | "danger" | "info";
  message: string;
};

export function BillingAlerts({
  usagePercentageMessages,
  usagePercentageAI,
  enforceLimits,
  overageMessages,
  overageAI,
}: Props) {
  const maxPct = Math.max(usagePercentageMessages ?? 0, usagePercentageAI ?? 0);
  const hasOverage = overageMessages > 0 || overageAI > 0;

  const alerts: Alert[] = [];

  if (maxPct >= 100 && enforceLimits) {
    alerts.push({
      type: "danger",
      message:
        "Incluído no plano esgotado neste período. Atualize o plano para voltar a ter margem no pacote base, ou contacte-nos se precisar de volumes especiais.",
    });
  } else if (maxPct >= 100 && !enforceLimits) {
    alerts.push({
      type: "warning",
      message: `Ultrapassou o volume incluído no plano neste período. O uso adicional («${STRIPE_USAGE_LINE_LABELS.extraConversations}» e «${STRIPE_USAGE_LINE_LABELS.extraAi}» na fatura) é registado e cobrado automaticamente — o atendimento continua sem interrupção.`,
    });
  } else if (maxPct >= 80) {
    alerts.push({
      type: "info",
      message:
        "Está próximo do que o seu plano inclui neste período. Se ultrapassar, o uso adicional passa a contar de forma automática — sem bloquear o serviço.",
    });
  }

  if (hasOverage && maxPct < 80) {
    alerts.push({
      type: "info",
      message: `Já há uso além do incluído neste período (aparece como «${STRIPE_USAGE_LINE_LABELS.extraConversations}» e «${STRIPE_USAGE_LINE_LABELS.extraAi}» na fatura).`,
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`rounded-lg px-4 py-3 text-sm ${
            a.type === "danger"
              ? "border border-red-300 bg-red-50 text-red-900"
              : a.type === "warning"
                ? "border border-amber-300 bg-amber-50 text-amber-950"
                : "border border-slate-200 bg-slate-50 text-slate-800"
          }`}
          role="alert"
        >
          {a.message}
        </div>
      ))}
    </div>
  );
}
