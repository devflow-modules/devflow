import Link from "next/link";
import { getOpsMetrics } from "@/lib/ops-metrics";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { listQueuesByTenant } from "@/modules/queues";
import { listAgentsByTenant } from "@/modules/agents";
import { listTenants } from "@/modules/tenants";

export default async function DashboardPage() {
  const metrics = await getOpsMetrics();
  let queuesCount = 0;
  let agentsCount = 0;
  if (hasSupabaseConfig()) {
    try {
      const tenants = await listTenants();
      const tenantId = tenants[0]?.id;
      if (tenantId) {
        const [queues, agents] = await Promise.all([
          listQueuesByTenant(tenantId),
          listAgentsByTenant(tenantId),
        ]);
        queuesCount = queues.length;
        agentsCount = agents.length;
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4">WhatsApp Platform — Dashboard</h1>
      <nav className="flex flex-wrap gap-4">
        <Link href="/dashboard" className="text-blue-600 underline">
          Dashboard
        </Link>
        <Link href="/conversations" className="text-blue-600 underline">
          Conversas
        </Link>
        <Link href="/agents" className="text-blue-600 underline">
          Agentes
        </Link>
        <Link href="/queues" className="text-blue-600 underline">
          Filas
        </Link>
        <Link href="/settings" className="text-blue-600 underline">
          Configurações
        </Link>
      </nav>
      <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-600">Tenants</p>
          <p className="text-2xl font-semibold">{metrics.tenants}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-600">Conversas</p>
          <p className="text-2xl font-semibold">{metrics.conversations}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-600">Mensagens (24h)</p>
          <p className="text-2xl font-semibold">{metrics.messagesLast24h}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-600">Filas</p>
          <p className="text-2xl font-semibold">{queuesCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-600">Agentes</p>
          <p className="text-2xl font-semibold">{agentsCount}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-500">
        Billing (users, assinaturas, MRR) não implementado para este produto.
      </p>
    </div>
  );
}
