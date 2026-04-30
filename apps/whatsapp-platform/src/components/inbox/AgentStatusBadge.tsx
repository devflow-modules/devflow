"use client";

import {
  normalizeOperationalStatus,
  OPERATIONAL_STATUS_LABEL,
  operationalStatusDotClass,
  type OperationalPresence,
} from "./agentOperationalStatus";

type AgentStatusBadgeProps = {
  status: string | null | undefined;
  /** compact = denso (inbox); comfortable = alinhado a badges de equipa (altura ~24px). */
  density?: "compact" | "comfortable";
  className?: string;
};

const SHELL_BY_PRESENCE: Record<OperationalPresence, string> = {
  available: "border-emerald-200/85 bg-emerald-50/90 text-emerald-950",
  busy: "border-red-200/85 bg-red-50/90 text-red-950",
  offline: "border-border/90 bg-muted/90 df-text-secondary",
};

/**
 * Estado do agente na operação (Livre / Em atendimento / Offline).
 * Raio e padding alinhados a `AgentRoleBadge` (rounded-md, altura visual consistente em modo comfortable).
 */
export function AgentStatusBadge({ status, density = "compact", className = "" }: AgentStatusBadgeProps) {
  const presence: OperationalPresence = normalizeOperationalStatus(status);
  const label = OPERATIONAL_STATUS_LABEL[presence];
  const shell = SHELL_BY_PRESENCE[presence];

  const pad =
    density === "compact"
      ? "h-[1.25rem] gap-1 px-1.5 py-0 text-[10px] leading-none"
      : "h-6 gap-1.5 px-2 py-0.5 text-xs font-medium leading-none";

  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-md border font-medium shadow-none ${shell} ${pad} ${className}`.trim()}
      title={label}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${operationalStatusDotClass(presence)}`} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
