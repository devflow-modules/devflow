/**
 * Normalização de payloads do webhook WhatsApp Cloud API.
 * Retorna estrutura tipada; não contém lógica de tenant.
 */

import type { RawWebhookPayload, NormalizedWebhookEvent, IncomingMessage } from "./types";

export function normalizeWebhookPayload(payload: unknown): NormalizedWebhookEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as RawWebhookPayload;
  if (raw.object !== "whatsapp_business_account" || !Array.isArray(raw.entry) || raw.entry.length === 0) {
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
      if (v.metadata) {
        phoneNumberId = v.metadata.phone_number_id ?? phoneNumberId;
        displayPhoneNumber = v.metadata.display_phone_number ?? displayPhoneNumber;
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
