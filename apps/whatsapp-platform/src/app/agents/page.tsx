import Link from "next/link";
import { getTenantSnapshot } from "@/lib/tenant-session";
import { listOperationalAgents } from "@/modules/inbox/operationsAgentsService";
import { PageHeader } from "@/components/ui/page-header";
import { StateEmpty } from "@/components/ui/app-states";
import { AgentsClient } from "./AgentsClient";

export default async function AgentsPage() {
  const snap = await getTenantSnapshot();
  if (!snap.authenticated) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Equipa"
          title="Agentes"
          description="Utilizadores do tenant e estado operacional na Inbox."
          showDivider
        />
        <StateEmpty
          title="Inicie sessão"
          description="É necessário estar autenticado para ver a equipa operacional."
          action={
            <Link href="/login" className="text-sm font-medium text-[var(--df-brand-600)] hover:underline">
              Ir para o login
            </Link>
          }
        />
      </div>
    );
  }

  const agents = await listOperationalAgents(snap.tenantId);
  return <AgentsClient agents={agents} />;
}
