import type { WhatsappPhoneNumberRow } from "./whatsappConnectTypes";

export function formatDisplayLine(n: WhatsappPhoneNumberRow): string {
  return n.displayPhoneNumber?.trim() || n.phoneNumberId;
}

export function statusLabel(status: string): string {
  if (status === "ACTIVE") return "Ativo";
  return status.replace(/_/g, " ");
}
