/**
 * Distribuição de conversas para agentes — round-robin, carga, horário.
 */

import { getSupabaseServiceClient } from "@/lib/supabase-server";
import type { Agent } from "@/lib/db/types";

export type DistributionStrategy = "round_robin" | "least_loaded" | "random";

/**
 * Escolhe o próximo agente disponível para a fila.
 * Estratégia: least_loaded (quem tem menos conversas em progresso).
 */
export async function selectNextAgent(
  tenantId: string,
  _queueId: string,
  strategy: DistributionStrategy = "least_loaded"
): Promise<Agent | null> {
  const supabase = getSupabaseServiceClient();
  const { data: agents, error: agentsError } = await supabase
    .from("agents")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "available");
  if (agentsError || !agents?.length) return null;

  if (strategy === "random") {
    return agents[Math.floor(Math.random() * agents.length)] as Agent;
  }

  if (strategy === "round_robin" || strategy === "least_loaded") {
    const counts = await Promise.all(
      (agents as { id: string }[]).map(async (a) => {
        const { count } = await supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("assigned_agent_id", a.id)
          .in("status", ["assigned", "in_progress"]);
        return { agentId: a.id, count: count ?? 0 };
      })
    );
    counts.sort((a, b) => a.count - b.count);
    const chosen = agents.find((a: { id: string }) => a.id === counts[0].agentId);
    return chosen as Agent;
  }

  return agents[0] as Agent;
}
