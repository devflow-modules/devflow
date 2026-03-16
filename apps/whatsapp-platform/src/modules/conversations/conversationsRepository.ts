/**
 * Repositório de conversas — criar, buscar, atualizar por tenant e wa_from.
 */

import { getSupabaseServiceClient } from "@/lib/supabase-server";
import type { Conversation, ConversationStatus } from "@/lib/db/types";

export async function findOrCreateConversation(
  tenantId: string,
  waFrom: string
): Promise<Conversation> {
  const supabase = getSupabaseServiceClient();
  const existing = await supabase
    .from("conversations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("wa_from", waFrom.replace(/\D/g, ""))
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.data) return existing.data as Conversation;
  const { data: inserted, error } = await supabase
    .from("conversations")
    .insert({
      tenant_id: tenantId,
      wa_from: waFrom.replace(/\D/g, ""),
      status: "open",
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(`conversations.insert: ${error.message}`);
  return inserted as Conversation;
}

export async function updateConversationStatus(
  id: string,
  status: ConversationStatus
): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("conversations").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`conversations.updateStatus: ${error.message}`);
}

export async function setConversationQueue(conversationId: string, queueId: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("conversations")
    .update({
      queue_id: queueId,
      status: "waiting_queue",
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
  if (error) throw new Error(`conversations.setQueue: ${error.message}`);
}

export async function assignConversationToAgent(
  conversationId: string,
  agentId: string
): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const { error: updErr } = await supabase
    .from("conversations")
    .update({
      assigned_agent_id: agentId,
      status: "assigned",
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
  if (updErr) throw new Error(`conversations.assign: ${updErr.message}`);
  const { error: insErr } = await supabase.from("conversation_assignments").insert({
    conversation_id: conversationId,
    agent_id: agentId,
  });
  if (insErr) throw new Error(`conversation_assignments.insert: ${insErr.message}`);
}

export async function listConversationsByStatus(
  tenantId: string,
  status: ConversationStatus | ConversationStatus[],
  limit: number
): Promise<Conversation[]> {
  const supabase = getSupabaseServiceClient();
  let q = supabase
    .from("conversations")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("last_message_at", { ascending: false })
    .limit(limit);
  if (Array.isArray(status)) q = q.in("status", status);
  else q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(`conversations.listByStatus: ${error.message}`);
  return (data ?? []) as Conversation[];
}

export async function touchConversationLastMessage(conversationId: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (error) throw new Error(`conversations.touch: ${error.message}`);
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`conversations.getById: ${error.message}`);
  return data as Conversation | null;
}

export async function listConversations(tenantId: string, limit: number): Promise<Conversation[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("last_message_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`conversations.list: ${error.message}`);
  return (data ?? []) as Conversation[];
}

export async function countConversations(tenantId?: string): Promise<number> {
  const supabase = getSupabaseServiceClient();
  let q = supabase.from("conversations").select("*", { count: "exact", head: true });
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { count, error } = await q;
  if (error) throw new Error(`conversations.count: ${error.message}`);
  return count ?? 0;
}
