import Link from "next/link";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { listAgentsByTenant, countActiveConversationsByAgent } from "@/modules/agents";
import { listTenants } from "@/modules/tenants";

export default async function AgentsPage() {
  let agents: { id: string; name: string; email: string | null; status: string; activeCount: number }[] = [];
  if (hasSupabaseConfig()) {
    try {
      const tenants = await listTenants();
      const tenantId = tenants[0]?.id;
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

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4">Agentes</h1>
      <Link href="/dashboard" className="text-blue-600 underline">
        Voltar ao Dashboard
      </Link>
      <div className="mt-4">
        {agents.length === 0 ? (
          <p className="text-gray-600">Nenhum agente cadastrado. Use a API POST /api/agents para criar.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {agents.map((a) => (
              <li key={a.id} className="flex justify-between items-center px-4 py-3">
                <div>
                  <span className="font-medium">{a.name}</span>
                  {a.email && <span className="text-sm text-gray-500 ml-2">({a.email})</span>}
                </div>
                <div className="flex gap-4">
                  <span className="text-sm text-gray-600">Status: {a.status}</span>
                  <span className="text-sm">Conversas ativas: {a.activeCount}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
