/**
 * Estados de presença operacional (`whatsapp_agent_status.status`).
 * Fonte única para UI — evitar mapear strings em vários sítios.
 */

export type OperationalPresence = "available" | "busy" | "offline";

export function normalizeOperationalStatus(raw: string | null | undefined): OperationalPresence {
  const s = (raw ?? "offline").toLowerCase();
  if (s === "available") return "available";
  if (s === "busy") return "busy";
  return "offline";
}

export const OPERATIONAL_STATUS_LABEL: Record<OperationalPresence, string> = {
  available: "Livre",
  busy: "Em atendimento",
  offline: "Offline",
};

/** Classes do indicador (ponto) — verde / vermelho / cinza */
export function operationalStatusDotClass(presence: OperationalPresence): string {
  switch (presence) {
    case "available":
      return "bg-emerald-500 ring-1 ring-emerald-600/20";
    case "busy":
      return "bg-red-500 ring-1 ring-red-600/25";
    default:
      return "bg-slate-400 ring-1 ring-slate-500/15";
  }
}
