import type { WhatsappLineSummary } from "./inboxTypes";
import { WHATSAPP_CHANNEL_PURPOSE_PT } from "@/lib/whatsappChannelPurposeLabels";

/**
 * Rótulo para o `<select>` de filtro por linha (Inbox).
 * Inclui nome interno, telefone de exibição e finalidade quando existirem.
 */
export function formatInboxLineFilterOptionLabel(line: WhatsappLineSummary): string {
  const purposePt = WHATSAPP_CHANNEL_PURPOSE_PT[line.purpose] ?? line.purpose;
  const label = line.label?.trim() || null;
  const phone = line.displayPhoneNumber?.trim() || null;
  const idShort = line.phoneNumberId.length > 14 ? `${line.phoneNumberId.slice(0, 12)}…` : line.phoneNumberId;

  const parts: string[] = [];
  if (label) parts.push(label);
  if (phone && phone !== label) parts.push(phone);
  if (parts.length === 0) parts.push(idShort);
  parts.push(purposePt);
  if (line.isPrimary) parts.push("Principal");
  if (line.isDefaultOutbound) parts.push("Envio padrão");

  return parts.join(" · ");
}
