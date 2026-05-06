import type { WhatsappLineSummary } from "./inboxTypes";
import { formatWhatsappLineFilterOptionLabel } from "@/lib/whatsapp-lines/linePresentation";

/**
 * Rótulo para o `<select>` de filtro por linha (Inbox).
 * Inclui nome interno, telefone de exibição e finalidade quando existirem.
 */
export function formatInboxLineFilterOptionLabel(line: WhatsappLineSummary): string {
  return formatWhatsappLineFilterOptionLabel(line);
}
