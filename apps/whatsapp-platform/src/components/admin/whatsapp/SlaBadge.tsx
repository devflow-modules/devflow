import type { SlaStatus } from "@/modules/whatsapp/channelActivationService";

const label: Record<SlaStatus, string> = {
  ok: "OK",
  delay: "Atraso",
  critical: "Crítico",
};

const className: Record<SlaStatus, string> = {
  ok: "bg-[var(--df-success-bg)] text-[var(--df-success-text)] ring-[var(--df-success-border)]",
  delay: "bg-[var(--df-warning-bg)] text-[#ffe4a5] ring-[var(--df-warning-border)]",
  critical: "bg-[var(--df-danger-bg)] text-[var(--df-danger-text)] ring-[var(--df-danger-border)]",
};

type Props = {
  status: SlaStatus;
  className?: string;
  /** Destaque forte para fila crítica (ação imediata). */
  urgent?: boolean;
};

/** SLA visual para tempo em fila de ativação. */
export function SlaBadge({ status, className: extra = "", urgent }: Props) {
  const urgentClass =
    status === "critical" && urgent
      ? "px-3 py-1 text-sm ring-2 ring-red-400/70 shadow-sm"
      : "";
  return (
    <span
      data-testid={`sla-badge-${status}`}
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${className[status]} ${urgentClass} ${extra}`.trim()}
    >
      {label[status]}
    </span>
  );
}
