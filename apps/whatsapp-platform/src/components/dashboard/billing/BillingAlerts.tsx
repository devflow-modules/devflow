"use client";

import Link from "next/link";
import { STRIPE_USAGE_LINE_LABELS } from "@/modules/billing/usageCommunication";
import { normalizePlan } from "@/modules/billing/plans";

type Props = {
  /** Plano normalizado (ex.: tenant billing). */
  currentPlan: string;
  usagePercentageMessages: number | null;
  usagePercentageAI: number | null;
  enforceLimits: boolean;
  overageMessages: number;
  overageAI: number;
};

type Alert = {
  type: "warning" | "danger" | "info";
  message: string;
  cta?: { href: string; label: string };
};

export function BillingAlerts({
  currentPlan,
  usagePercentageMessages,
  usagePercentageAI,
  enforceLimits,
  overageMessages,
  overageAI,
}: Props) {
  const planKey = normalizePlan(currentPlan);
  const isFree = planKey === "FREE";
  const maxPct = Math.max(usagePercentageMessages ?? 0, usagePercentageAI ?? 0);
  const hasOverage = overageMessages > 0 || overageAI > 0;

  const alerts: Alert[] = [];

  if (maxPct >= 100 && enforceLimits) {
    if (isFree) {
      alerts.push({
        type: "danger",
        message:
          "Atingiu o limite da avaliação. Ative a operação contratada para continuar o atendimento — Consumo e faturação ou contacte a equipa.",
        cta: { href: "/dashboard/billing", label: "Consumo e faturação" },
      });
    } else {
      alerts.push({
        type: "danger",
        message:
          "Pacote incluído esgotado neste período e bloqueio técnico ativo. Contacte a equipa para ajustar o contrato ou volumes.",
      });
    }
  } else if (maxPct >= 100 && !enforceLimits) {
      alerts.push({
        type: "warning",
        message: `Ultrapassou o volume incluído no pacote neste período. O uso adicional («${STRIPE_USAGE_LINE_LABELS.extraConversations}» e «${STRIPE_USAGE_LINE_LABELS.extraAi}» na fatura) é registado e faturado automaticamente — o atendimento segue sem interrupção.`,
      });
  } else if (maxPct >= 80) {
    if (isFree) {
      alerts.push({
        type: "info",
        message: "Está perto do limite da avaliação. Ative a operação contratada a tempo para não interromper o atendimento.",
        cta: { href: "/dashboard/billing", label: "Consumo e faturação" },
      });
    } else {
      alerts.push({
        type: "info",
        message:
          "Está próximo do que o pacote inclui neste período. Se ultrapassar, o uso adicional conta de forma automática — sem bloquear o serviço.",
      });
    }
  }

  if (hasOverage && maxPct < 80 && !isFree) {
    alerts.push({
      type: "info",
      message: `Já há uso adicional neste período (aparece como «${STRIPE_USAGE_LINE_LABELS.extraConversations}» e «${STRIPE_USAGE_LINE_LABELS.extraAi}» na fatura).`,
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
          <p>{a.message}</p>
          {a.cta ? (
            <Link
              href={a.cta.href}
              className="mt-2 inline-block text-sm font-semibold text-[var(--df-brand-700)] underline-offset-2 hover:underline"
            >
              {a.cta.label} →
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}
