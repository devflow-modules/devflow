"use client";

import Link from "next/link";
import { STRIPE_USAGE_LINE_LABELS } from "@/modules/billing/usageCommunication";
import { normalizePlan } from "@/modules/billing/plans";
import { formatFreeEvaluationUsageCounts } from "@/modules/billing/demoEvaluation";
import { isWhiteLabelMode } from "@/lib/productMode";

type Props = {
  /** Pacote normalizado (ex.: tenant billing). */
  currentPlan: string;
  usagePercentageMessages: number | null;
  usagePercentageAI: number | null;
  enforceLimits: boolean;
  overageMessages: number;
  overageAI: number;
  /** Opcional — mensagens com contagem na avaliação (FREE). */
  messagesUsed?: number;
  messagesLimit?: number | null;
  aiUsed?: number;
  aiLimit?: number | null;
};

type Alert = {
  type: "warning" | "danger" | "info";
  message: string;
  cta?: { href: string; label: string };
};

function freeEvaluationCountLine(
  messagesUsed: number | undefined,
  messagesLimit: number | null | undefined,
  aiUsed: number | undefined,
  aiLimit: number | null | undefined
): string | null {
  if (
    typeof messagesUsed !== "number" ||
    messagesLimit == null ||
    messagesLimit <= 0 ||
    typeof aiUsed !== "number" ||
    aiLimit == null ||
    aiLimit <= 0
  ) {
    return null;
  }
  return formatFreeEvaluationUsageCounts(messagesUsed, messagesLimit, aiUsed, aiLimit);
}

export function BillingAlerts({
  currentPlan,
  usagePercentageMessages,
  usagePercentageAI,
  enforceLimits,
  overageMessages,
  overageAI,
  messagesUsed,
  messagesLimit,
  aiUsed,
  aiLimit,
}: Props) {
  if (isWhiteLabelMode()) return null;

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
          "Atingiu o limite da avaliação. Ative a operação contratada para continuar o atendimento — Contrato e uso ou contacte a equipa.",
        cta: { href: "/dashboard/billing", label: "Contrato e uso" },
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
      message: `Ultrapassou o volume incluído no pacote neste período. O uso adicional («${STRIPE_USAGE_LINE_LABELS.extraConversations}» e «${STRIPE_USAGE_LINE_LABELS.extraAi}» no extrato) é registado conforme o contrato — o atendimento segue sem interrupção.`,
    });
  } else if (isFree && maxPct >= 90 && maxPct < 100) {
    const count = freeEvaluationCountLine(messagesUsed, messagesLimit, aiUsed, aiLimit);
    alerts.push({
      type: "info",
      message: count
        ? `${count} Recomendamos alinhar a operação completa antes de atingir o teto da avaliação.`
        : "Está a usar quase todo o incluído na avaliação neste período. Avance para a operação completa a tempo para não interromper o atendimento.",
      cta: { href: "/dashboard/billing", label: "Contrato e uso" },
    });
  } else if (maxPct >= 80) {
    if (isFree) {
      const count = freeEvaluationCountLine(messagesUsed, messagesLimit, aiUsed, aiLimit);
      alerts.push({
        type: "info",
        message: count
          ? `Está perto do limite da avaliação. ${count} A operação completa libera volumes e funcionalidades na implantação.`
          : "Está perto do limite da avaliação. Ative a operação contratada a tempo para não interromper o atendimento.",
        cta: { href: "/dashboard/billing", label: "Contrato e uso" },
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
      message: `Já há uso adicional neste período (aparece como «${STRIPE_USAGE_LINE_LABELS.extraConversations}» e «${STRIPE_USAGE_LINE_LABELS.extraAi}» no extrato).`,
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
              ? "df-feedback-error"
              : a.type === "warning"
                ? "df-feedback-warning"
                : "df-feedback-info"
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
