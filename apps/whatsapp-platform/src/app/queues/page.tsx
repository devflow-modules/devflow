import { hasSupabaseConfig } from "@/lib/supabase-server";
import { listQueuesByTenant, countConversationsInQueue } from "@/modules/queues";
import { listTenants } from "@/modules/tenants";
import { QueuesClient } from "./QueuesClient";

export default async function QueuesPage() {
  let tenantId: string | null = null;
  let queues: { id: string; name: string; slug: string; max_size: number | null; pendingCount: number }[] = [];
  if (hasSupabaseConfig()) {
    try {
      const tenants = await listTenants();
      tenantId = tenants[0]?.id ?? null;
      if (tenantId) {
        const list = await listQueuesByTenant(tenantId);
        queues = await Promise.all(
          list.map(async (q) => ({
            id: q.id,
            name: q.name,
            slug: q.slug,
            max_size: q.max_size,
            pendingCount: await countConversationsInQueue(q.id),
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
        <h1 className="text-2xl font-semibold mb-4">Filas</h1>
        <p className="text-gray-600">
          Configure o Supabase e tenha ao menos um tenant para gerenciar filas.
        </p>
      </div>
    );
  }

  return <QueuesClient tenantId={tenantId} queues={queues} />;
}
