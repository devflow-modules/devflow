import Link from "next/link";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { listQueuesByTenant, countConversationsInQueue } from "@/modules/queues";
import { listTenants } from "@/modules/tenants";

export default async function QueuesPage() {
  let queues: { id: string; name: string; slug: string; max_size: number | null; pendingCount: number }[] = [];
  if (hasSupabaseConfig()) {
    try {
      const tenants = await listTenants();
      const tenantId = tenants[0]?.id;
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

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4">Filas</h1>
      <Link href="/dashboard" className="text-blue-600 underline">
        Voltar ao Dashboard
      </Link>
      <div className="mt-4">
        {queues.length === 0 ? (
          <p className="text-gray-600">Nenhuma fila cadastrada. Use a API POST /api/queues para criar.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {queues.map((q) => (
              <li key={q.id} className="flex justify-between items-center px-4 py-3">
                <div>
                  <span className="font-medium">{q.name}</span>
                  <span className="text-sm text-gray-500 ml-2">({q.slug})</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-sm">Pendentes: {q.pendingCount}</span>
                  {q.max_size != null && (
                    <span className="text-sm text-gray-500">Máx: {q.max_size}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
