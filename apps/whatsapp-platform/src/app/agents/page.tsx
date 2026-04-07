import { hasSupabaseConfig } from "@/lib/supabase-server";
import { listAgentsByTenant, countActiveConversationsByAgent } from "@/modules/agents";
import { listTenants } from "@/modules/tenants";
import { PageHeader } from "@/components/ui/page-header";
import { StateEmpty } from "@/components/ui/app-states";
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
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Equipa"
          title="Agentes"
          description="Gestão de agentes por tenant."
          showDivider
        />
        <StateEmpty
          title="Ambiente incompleto"
          description="Configure o Supabase e garanta pelo menos um tenant na base de dados para criar e listar agentes."
        />
      </div>
    );
  }

  return <AgentsClient tenantId={tenantId} agents={agents} />;
}
