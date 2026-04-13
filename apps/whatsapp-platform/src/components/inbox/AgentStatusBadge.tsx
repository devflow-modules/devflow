"use client";

import {
  normalizeOperationalStatus,
  OPERATIONAL_STATUS_LABEL,
  operationalStatusDotClass,
  type OperationalPresence,
} from "./agentOperationalStatus";

type AgentStatusBadgeProps = {
  status: string | null | undefined;
  /** compact = só ponto + label curta; comfortable = um pouco mais de ar */
  density?: "compact" | "comfortable";
  className?: string;
};

/**
 * Estado do agente na operação (Livre / Em atendimento / Offline).
 */
export function AgentStatusBadge({ status, density = "compact", className = "" }: AgentStatusBadgeProps) {
  const presence: OperationalPresence = normalizeOperationalStatus(status);
  const label = OPERATIONAL_STATUS_LABEL[presence];
  const pad = density === "compact" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]";

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-slate-100/90 bg-white font-medium text-slate-700 shadow-sm ${pad} ${className}`.trim()}
      title={label}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${operationalStatusDotClass(presence)}`} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
