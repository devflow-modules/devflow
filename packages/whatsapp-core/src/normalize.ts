/**
 * Normalização de payloads do webhook WhatsApp Cloud API.
 * Retorna estrutura tipada; não contém lógica de tenant.
 */

import type { RawWebhookPayload, NormalizedWebhookEvent, IncomingMessage } from "./types";

export function normalizeWebhookPayload(payload: unknown): NormalizedWebhookEvent | null {
  if (!payload || typeof payload !== "object") {
    console.warn("[WHATSAPP][DEBUG] normalize: payload null or not object");
    return null;
  }
  const raw = payload as RawWebhookPayload;
  if (raw.object !== "whatsapp_business_account") {
    console.warn("[WHATSAPP][DEBUG] normalize: object !== whatsapp_business_account", { object: raw.object });
    return null;
  }
  if (!Array.isArray(raw.entry) || raw.entry.length === 0) {
    console.warn("[WHATSAPP][DEBUG] normalize: entry empty or not array", { entryLen: Array.isArray(raw.entry) ? raw.entry.length : "n/a" });
    return null;
  }
  const messages: IncomingMessage[] = [];
  const statuses: unknown[] = [];
  const errors: unknown[] = [];
  let phoneNumberId = "";
  let displayPhoneNumber = "";

  for (const entry of raw.entry) {
    if (!entry.changes) continue;
    for (const change of entry.changes) {
      const v = change.value;
      if (!v || v.messaging_product !== "whatsapp") continue;
      if (change.field === "smb_message_echoes") continue;
      if (v.metadata) {
        const rawId = v.metadata.phone_number_id;
        phoneNumberId = rawId != null ? String(rawId) : phoneNumberId;
        const rawDisplay = v.metadata.display_phone_number;
        displayPhoneNumber = rawDisplay != null ? String(rawDisplay) : displayPhoneNumber;
      }
      if (Array.isArray(v.messages)) messages.push(...(v.messages as IncomingMessage[]));
      if (Array.isArray(v.statuses)) statuses.push(...v.statuses);
      if (Array.isArray(v.errors)) errors.push(...v.errors);
    }
  }

  return {
    phoneNumberId,
    displayPhoneNumber,
    messages,
    statuses,
    errors,
  };
}
