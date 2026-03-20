"use client";

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
  const maxPct = Math.max(
    usagePercentageMessages ?? 0,
    usagePercentageAI ?? 0
  );
  const hasOverage = overageMessages > 0 || overageAI > 0;

  const alerts: Alert[] = [];

  if (maxPct >= 100 && enforceLimits) {
    alerts.push({
      type: "danger",
      message: "Limite atingido — faça upgrade para continuar.",
    });
  } else if (maxPct >= 100 && !enforceLimits) {
    alerts.push({
      type: "warning",
      message: "Você está sendo cobrado por uso adicional.",
    });
  } else if (maxPct >= 80) {
    alerts.push({
      type: "warning",
      message: "Você está próximo do limite.",
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
                ? "border border-amber-300 bg-amber-50 text-amber-900"
                : "border border-blue-200 bg-blue-50 text-blue-900"
          }`}
          role="alert"
        >
          {a.message}
        </div>
      ))}
    </div>
  );
}
