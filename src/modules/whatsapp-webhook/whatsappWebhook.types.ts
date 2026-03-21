/**
 * Tipos do webhook WhatsApp Cloud API (verification + inbound).
 */

export type WebhookVerificationResult =
  | { ok: true; challenge: string }
  | { ok: false; reason: "MODE_INVALID" | "TOKEN_INVALID" | "CHALLENGE_MISSING" };

/** Payload bruto (mínimo) — compatível com evolução da Meta */
export interface MetaWebhookBody {
  object?: string;
  entry?: MetaWebhookEntry[];
}

export interface MetaWebhookEntry {
  id?: string;
  changes?: MetaWebhookChange[];
}

export interface MetaWebhookChange {
  field?: string;
  value?: MetaWebhookChangeValue;
}

export interface MetaWebhookChangeValue {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: Array<{
    profile?: { name?: string };
    wa_id?: string;
  }>;
  messages?: MetaInboundMessage[];
  statuses?: MetaStatusUpdate[];
  errors?: MetaWebhookError[];
  [key: string]: unknown;
}

export interface MetaInboundMessage {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  errors?: MetaWebhookError[];
  [key: string]: unknown;
}

export interface MetaStatusUpdate {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: MetaWebhookError[];
  [key: string]: unknown;
}

export interface MetaWebhookError {
  code?: number;
  title?: string;
  message?: string;
  error_data?: { details?: string };
  [key: string]: unknown;
}

export type ParsedWebhookEvent =
  | ParsedMessageEvent
  | ParsedStatusEvent
  | ParsedErrorEvent
  | ParsedUnknownFieldEvent
  | ParsedUnknownObjectEvent;

export interface ParsedMessageEvent {
  kind: "message";
  object: string;
  wabaEntryId?: string;
  field: string;
  metadata?: MetaWebhookChangeValue["metadata"];
  messageId?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  contactName?: string;
  rawMessage: MetaInboundMessage;
}

export interface ParsedStatusEvent {
  kind: "status";
  object: string;
  wabaEntryId?: string;
  field: string;
  messageId?: string;
  status?: string;
  recipientId?: string;
  timestamp?: string;
  rawStatus: MetaStatusUpdate;
}

export interface ParsedErrorEvent {
  kind: "errors";
  object: string;
  wabaEntryId?: string;
  field: string;
  errors: MetaWebhookError[];
}

export interface ParsedUnknownFieldEvent {
  kind: "unknown_field";
  object: string;
  wabaEntryId?: string;
  field: string;
  summary: string;
}

export interface ParsedUnknownObjectEvent {
  kind: "unknown_object";
  object: string;
  summary: string;
}
