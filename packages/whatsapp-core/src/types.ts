/**
 * Tipos compartilhados para WhatsApp Cloud API.
 * Sem lógica por tenant — apenas contratos.
 */

export type MessageType = "text" | "image" | "audio" | "video" | "document" | "location" | "contacts" | "interactive" | "button" | "reaction";

export interface WhatsAppContact {
  wa_id: string;
  profile?: { name?: string };
}

export interface IncomingTextBody {
  body?: string;
}

export interface IncomingMessageBase {
  id: string;
  from: string;
  timestamp: string;
  type: MessageType;
}

export interface IncomingTextMessage extends IncomingMessageBase {
  type: "text";
  text?: IncomingTextBody;
}

export interface IncomingReactionMessage extends IncomingMessageBase {
  type: "reaction";
  reaction?: { message_id: string; emoji?: string };
}

export type IncomingMessage = IncomingTextMessage | IncomingReactionMessage | IncomingMessageBase;

export interface WebhookChangeValue {
  messaging_product: "whatsapp";
  metadata: { display_phone_number: string; phone_number_id: string };
  contacts?: WhatsAppContact[];
  messages?: IncomingMessage[];
  statuses?: unknown[];
  errors?: unknown[];
}

export interface WebhookChange {
  value: WebhookChangeValue;
  field: string;
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface RawWebhookPayload {
  object?: string;
  entry?: WebhookEntry[];
}

export interface NormalizedWebhookEvent {
  phoneNumberId: string;
  displayPhoneNumber: string;
  messages: IncomingMessage[];
  statuses: unknown[];
  errors: unknown[];
}

export interface SendTextOptions {
  to: string;
  text: string;
  previewUrl?: boolean;
}

export interface MessageStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp?: string;
}
