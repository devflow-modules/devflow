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

/** Classes do indicador (ponto) — alinhadas a `.df-status-dot--*` em globals.css */
export function operationalStatusDotClass(presence: OperationalPresence): string {
  switch (presence) {
    case "available":
      return "df-status-dot--ok";
    case "busy":
      return "df-status-dot--busy";
    default:
      return "df-status-dot--muted";
  }
}
