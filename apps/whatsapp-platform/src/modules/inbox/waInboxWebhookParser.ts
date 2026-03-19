/**
 * Extrai eventos do payload bruto Meta para persistência inbox (inclui field por change).
 */

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

export interface ParsedWaInbound {
  waMessageId: string;
  from: string;
  timestamp: string;
  type: string;
  field: string;
  contactName?: string;
  displayPhone?: string;
  raw: Record<string, unknown>;
}

export interface ParsedWaStatus {
  waMessageId: string;
  status: string;
  timestamp?: string;
  recipientId?: string;
  raw: Record<string, unknown>;
}

export function parseWaInboxWebhookPayload(body: unknown): {
  inbound: ParsedWaInbound[];
  statuses: ParsedWaStatus[];
} {
  const inbound: ParsedWaInbound[] = [];
  const statuses: ParsedWaStatus[] = [];
  if (!isRecord(body) || body.object !== "whatsapp_business_account") {
    return { inbound, statuses };
  }
  const entries = Array.isArray(body.entry) ? body.entry : [];
  for (const ent of entries) {
    if (!isRecord(ent)) continue;
    const changes = Array.isArray(ent.changes) ? ent.changes : [];
    for (const ch of changes) {
      if (!isRecord(ch)) continue;
      const field = typeof ch.field === "string" ? ch.field : "unknown";
      const value = isRecord(ch.value) ? ch.value : {};
      const displayPhone =
        isRecord(value.metadata) && typeof value.metadata.display_phone_number === "string"
          ? value.metadata.display_phone_number
          : undefined;
      const contacts = Array.isArray(value.contacts)
        ? (value.contacts as Array<{ wa_id?: string; profile?: { name?: string } }>)
        : [];

      function nameForFrom(from: string): string | undefined {
        for (const c of contacts) {
          if (c?.wa_id === from && c.profile && typeof c.profile.name === "string") {
            return c.profile.name;
          }
        }
        return undefined;
      }

      if (field === "messages" || field === "smb_message_echoes") {
        const msgs = Array.isArray(value.messages) ? value.messages : [];
        for (const m of msgs) {
          if (!isRecord(m)) continue;
          const id = typeof m.id === "string" ? m.id : "";
          const from = typeof m.from === "string" ? m.from : "";
          if (!id || !from) continue;
          if (field === "smb_message_echoes") continue;
          const ts = typeof m.timestamp === "string" ? m.timestamp : String(Date.now());
          const typ = typeof m.type === "string" ? m.type : "unknown";
          inbound.push({
            waMessageId: id,
            from,
            timestamp: ts,
            type: typ,
            field,
            contactName: nameForFrom(from),
            displayPhone,
            raw: m as Record<string, unknown>,
          });
        }

        const sts = Array.isArray(value.statuses) ? value.statuses : [];
        for (const s of sts) {
          if (!isRecord(s)) continue;
          const id = typeof s.id === "string" ? s.id : "";
          const st = typeof s.status === "string" ? s.status : "";
          if (!id || !st) continue;
          statuses.push({
            waMessageId: id,
            status: st,
            timestamp: typeof s.timestamp === "string" ? s.timestamp : undefined,
            recipientId: typeof s.recipient_id === "string" ? s.recipient_id : undefined,
            raw: s as Record<string, unknown>,
          });
        }
      }
    }
  }
  return { inbound, statuses };
}
