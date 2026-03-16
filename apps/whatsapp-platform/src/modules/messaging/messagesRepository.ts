/**
 * Repositório de mensagens — persistir inbound/outbound e contar.
 */

import { getSupabaseServiceClient } from "@/lib/supabase-server";
import type { Message } from "@/lib/db/types";

export interface InsertMessageInput {
  conversation_id: string;
  direction: "inbound" | "outbound";
  wa_message_id: string | null;
  body: string;
  status?: string | null;
}

export async function insertMessage(input: InsertMessageInput): Promise<Message> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversation_id,
      direction: input.direction,
      wa_message_id: input.wa_message_id ?? null,
      body: input.body,
      status: input.status ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`messages.insert: ${error.message}`);
  return data as Message;
}

export async function countMessagesLast24h(tenantId?: string): Promise<number> {
  const supabase = getSupabaseServiceClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let q = supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (tenantId) {
    const { data: convIds } = await supabase.from("conversations").select("id").eq("tenant_id", tenantId);
    const ids = (convIds ?? []).map((c: { id: string }) => c.id);
    if (ids.length === 0) return 0;
    q = q.in("conversation_id", ids);
  }
  const { count, error } = await q;
  if (error) throw new Error(`messages.countLast24h: ${error.message}`);
  return count ?? 0;
}
