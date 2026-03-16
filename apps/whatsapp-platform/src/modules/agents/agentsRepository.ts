/**
 * Repositório de agentes — CRUD por tenant.
 */

import { getSupabaseServiceClient } from "@/lib/supabase-server";
import type { Agent, AgentStatus } from "@/lib/db/types";

export async function listAgentsByTenant(tenantId: string): Promise<Agent[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw new Error(`agents.list: ${error.message}`);
  return (data ?? []) as Agent[];
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("agents").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`agents.getById: ${error.message}`);
  return data as Agent | null;
}

export async function createAgent(params: {
  tenant_id: string;
  name: string;
  email?: string | null;
  status?: AgentStatus;
}): Promise<Agent> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("agents")
    .insert({
      tenant_id: params.tenant_id,
      name: params.name,
      email: params.email ?? null,
      status: params.status ?? "offline",
    })
    .select()
    .single();
  if (error) throw new Error(`agents.create: ${error.message}`);
  return data as Agent;
}

export async function updateAgent(
  id: string,
  updates: { name?: string; email?: string | null; status?: AgentStatus }
): Promise<Agent> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("agents")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`agents.update: ${error.message}`);
  return data as Agent;
}

export async function deleteAgent(id: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("agents").delete().eq("id", id);
  if (error) throw new Error(`agents.delete: ${error.message}`);
}

export async function countActiveConversationsByAgent(agentId: string): Promise<number> {
  const supabase = getSupabaseServiceClient();
  const { count, error } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("assigned_agent_id", agentId)
    .in("status", ["assigned", "in_progress"]);
  if (error) throw new Error(`agents.countActive: ${error.message}`);
  return count ?? 0;
}
