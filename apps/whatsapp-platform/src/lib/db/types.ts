/**
 * Tipos das entidades do banco (Supabase) do produto WhatsApp Platform.
 * Schema real deve ser criado no projeto Supabase; ver README e migrations.
 */

export interface Tenant {
  id: string;
  phone_number_id: string;
  display_phone_number: string | null;
  access_token: string;
  verify_token: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  wa_from: string;
  status: ConversationStatus;
  assigned_agent_id: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export type ConversationStatus = "open" | "waiting" | "assigned" | "resolved" | "closed";

export interface Message {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  wa_message_id: string | null;
  body: string;
  status: string | null;
  created_at: string;
}

export interface WebhookLog {
  id: string;
  tenant_id: string | null;
  payload: unknown;
  processed_at: string | null;
  created_at: string;
}
