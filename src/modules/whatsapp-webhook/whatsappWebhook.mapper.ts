import type {
  MetaInboundMessage,
  MetaStatusUpdate,
  MetaWebhookBody,
  MetaWebhookError,
  ParsedWebhookEvent,
} from "./whatsappWebhook.types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toErrors(arr: unknown): MetaWebhookError[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter(isRecord) as MetaWebhookError[];
}

function toMessages(arr: unknown): MetaInboundMessage[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter(isRecord) as MetaInboundMessage[];
}

function toStatuses(arr: unknown): MetaStatusUpdate[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter(isRecord) as MetaStatusUpdate[];
}

export function mapWebhookBodyToEvents(body: MetaWebhookBody): ParsedWebhookEvent[] {
  const events: ParsedWebhookEvent[] = [];
  const object = body.object ?? "unknown";

  if (object !== "whatsapp_business_account" && object !== "unknown") {
    events.push({
      kind: "unknown_object",
      object,
      summary: "object_type_" + object,
    });
  }

  const entries = Array.isArray(body.entry) ? body.entry : [];
  for (const ent of entries) {
    const wabaEntryId = typeof ent.id === "string" ? ent.id : undefined;
    const changes = Array.isArray(ent.changes) ? ent.changes : [];

    for (const ch of changes) {
      const field = typeof ch.field === "string" ? ch.field : "unknown";
      const value = isRecord(ch.value) ? ch.value : {};

      if (field === "messages" || field === "smb_message_echoes") {
        const errs = toErrors(value.errors);
        if (errs.length > 0) {
          events.push({
            kind: "errors",
            object,
            wabaEntryId,
            field,
            errors: errs,
          });
        }

        const metadata = isRecord(value.metadata)
          ? {
              display_phone_number:
                typeof value.metadata.display_phone_number === "string"
                  ? value.metadata.display_phone_number
                  : undefined,
              phone_number_id:
                typeof value.metadata.phone_number_id === "string"
                  ? value.metadata.phone_number_id
                  : undefined,
            }
          : undefined;

        const messages = toMessages(value.messages);
        const statuses = toStatuses(value.statuses);
        const contactList = Array.isArray(value.contacts)
          ? (value.contacts as Array<{ wa_id?: string; profile?: { name?: string } }>)
          : [];

        function contactNameForFrom(from: string | undefined): string | undefined {
          if (!from) return undefined;
          for (const c of contactList) {
            if (c && c.wa_id === from && c.profile && typeof c.profile.name === "string") {
              return c.profile.name;
            }
          }
          return undefined;
        }

        for (const msg of messages) {
          const from = typeof msg.from === "string" ? msg.from : undefined;
          events.push({
            kind: "message",
            object,
            wabaEntryId,
            field,
            metadata,
            messageId: typeof msg.id === "string" ? msg.id : undefined,
            from,
            timestamp: typeof msg.timestamp === "string" ? msg.timestamp : undefined,
            type: typeof msg.type === "string" ? msg.type : undefined,
            contactName: contactNameForFrom(from),
            rawMessage: msg,
          });
        }

        for (const st of statuses) {
          events.push({
            kind: "status",
            object,
            wabaEntryId,
            field,
            messageId: typeof st.id === "string" ? st.id : undefined,
            status: typeof st.status === "string" ? st.status : undefined,
            recipientId: typeof st.recipient_id === "string" ? st.recipient_id : undefined,
            timestamp: typeof st.timestamp === "string" ? st.timestamp : undefined,
            rawStatus: st,
          });
        }

        if (messages.length === 0 && statuses.length === 0 && errs.length === 0) {
          events.push({
            kind: "unknown_field",
            object,
            wabaEntryId,
            field,
            summary: "messages_change_empty_or_unknown_shape",
          });
        }
      } else {
        events.push({
          kind: "unknown_field",
          object,
          wabaEntryId,
          field,
          summary: "field_" + field,
        });
      }
    }
  }

  const hasNonEmpty = entries.length > 0;
  if (!hasNonEmpty) {
    const onlyUnknownObject = events.every((e) => e.kind === "unknown_object");
    if (onlyUnknownObject || events.length === 0) {
      events.push({
        kind: "unknown_object",
        object,
        summary: "empty_entry",
      });
    }
  }

  return events;
}
