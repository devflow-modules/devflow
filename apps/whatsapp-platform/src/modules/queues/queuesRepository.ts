/**
 * Repositório de filas — CRUD por tenant.
 */

import { getSupabaseServiceClient } from "@/lib/supabase-server";
import type { Queue } from "@/lib/db/types";

export async function listQueuesByTenant(tenantId: string): Promise<Queue[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("queues")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw new Error(`queues.list: ${error.message}`);
  return (data ?? []) as Queue[];
}

export async function getQueueById(id: string): Promise<Queue | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("queues").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`queues.getById: ${error.message}`);
  return data as Queue | null;
}

export async function getQueueBySlug(tenantId: string, slug: string): Promise<Queue | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("queues")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`queues.getBySlug: ${error.message}`);
  return data as Queue | null;
}

export async function createQueue(params: {
  tenant_id: string;
  name: string;
  slug: string;
  settings?: Record<string, unknown>;
  max_size?: number | null;
}): Promise<Queue> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("queues")
    .insert({
      tenant_id: params.tenant_id,
      name: params.name,
      slug: params.slug,
      settings: params.settings ?? {},
      max_size: params.max_size ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`queues.create: ${error.message}`);
  return data as Queue;
}

export async function updateQueue(
  id: string,
  updates: { name?: string; settings?: Record<string, unknown>; max_size?: number | null }
): Promise<Queue> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("queues")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`queues.update: ${error.message}`);
  return data as Queue;
}

export async function deleteQueue(id: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("queues").delete().eq("id", id);
  if (error) throw new Error(`queues.delete: ${error.message}`);
}

export async function countConversationsInQueue(queueId: string): Promise<number> {
  const supabase = getSupabaseServiceClient();
  const { count, error } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("queue_id", queueId)
    .in("status", ["waiting_queue", "waiting", "assigned", "in_progress"]);
  if (error) throw new Error(`queues.countConversations: ${error.message}`);
  return count ?? 0;
}
