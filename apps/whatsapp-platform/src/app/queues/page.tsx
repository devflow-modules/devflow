import { hasSupabaseConfig } from "@/lib/supabase-server";
import { listQueuesByTenant, countConversationsInQueue } from "@/modules/queues";
import { listTenants } from "@/modules/tenants";
import { PageHeader } from "@/components/ui/page-header";
import { StateEmpty } from "@/components/ui/app-states";
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
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Operação"
          title="Filas"
          description="Gestão de filas por tenant."
          showDivider
        />
        <StateEmpty
          title="Ambiente incompleto"
          description="Configure o Supabase e garanta pelo menos um tenant na base de dados para criar e listar filas."
        />
      </div>
    );
  }

  return <QueuesClient tenantId={tenantId} queues={queues} />;
}
