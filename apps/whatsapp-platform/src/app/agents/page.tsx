import { hasSupabaseConfig } from "@/lib/supabase-server";
import { listAgentsByTenant, countActiveConversationsByAgent } from "@/modules/agents";
import { listTenants } from "@/modules/tenants";
import { AgentsClient } from "./AgentsClient";

export default async function AgentsPage() {
  let tenantId: string | null = null;
  let agents: { id: string; name: string; email: string | null; status: string; activeCount: number }[] = [];
  if (hasSupabaseConfig()) {
    try {
      const tenants = await listTenants();
      tenantId = tenants[0]?.id ?? null;
      if (tenantId) {
        const list = await listAgentsByTenant(tenantId);
        agents = await Promise.all(
          list.map(async (a) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            status: a.status,
            activeCount: await countActiveConversationsByAgent(a.id),
          }))
        );
      }
    } catch {
      // ignore
    }
  }

  if (!tenantId) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold mb-4">Agentes</h1>
        <p className="text-gray-600">
          Configure o Supabase e tenha ao menos um tenant para gerenciar agentes.
        </p>
      </div>
    );
  }

  return <AgentsClient tenantId={tenantId} agents={agents} />;
}
