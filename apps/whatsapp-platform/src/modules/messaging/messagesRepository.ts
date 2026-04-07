/**
 * @deprecated Repositório Supabase (`messages` / `conversations`).
 * Não usar em fluxos runtime de mensagens — ver `docs/whatsapp-platform/CANONICAL_MESSAGING.md`.
 * Mantido apenas para export/admin legado que ainda lê tabelas antigas.
 */

import { getSupabaseServiceClient } from "@/lib/supabase-server";
import type { Message } from "@/lib/db/types";

export async function listMessagesByConversation(conversationId: string, limit = 100): Promise<Message[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`messages.listByConversation: ${error.message}`);
  return (data ?? []) as Message[];
}

export async function listMessagesInRange(
  conversationIds: string[],
  from: string,
  to: string,
  limit = 10000
): Promise<Message[]> {
  if (conversationIds.length === 0) return [];
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", conversationIds)
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`messages.listInRange: ${error.message}`);
  return (data ?? []) as Message[];
}

/** Retorna a última mensagem (body + created_at) por conversation_id. */
export async function getLastMessageForConversationIds(
  conversationIds: string[]
): Promise<Map<string, { body: string; created_at: string }>> {
  if (conversationIds.length === 0) return new Map();
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("messages")
    .select("conversation_id, body, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`messages.getLastForConversations: ${error.message}`);
  const map = new Map<string, { body: string; created_at: string }>();
  for (const row of data ?? []) {
    const cid = (row as { conversation_id: string; body: string; created_at: string }).conversation_id;
    if (!map.has(cid)) map.set(cid, { body: (row as { body: string }).body, created_at: (row as { created_at: string }).created_at });
  }
  return map;
}
