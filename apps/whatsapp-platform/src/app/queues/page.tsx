import { Suspense } from "react";
import Link from "next/link";
import { getTenantSnapshot } from "@/lib/tenant-session";
import { listOperationalQueuesWithMetrics } from "@/modules/inbox/inboxOperationalQueueService";
import { PageHeader } from "@/components/ui/page-header";
import { StateEmpty } from "@/components/ui/app-states";
import { QueuesClient } from "./QueuesClient";

export default async function QueuesPage() {
  const snap = await getTenantSnapshot();
  if (!snap.authenticated) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Operação"
          title="Filas"
          description="Filas da Inbox (fonte canónica Prisma)."
          showDivider
        />
        <StateEmpty
          title="Inicie sessão"
          description="É necessário estar autenticado para gerir filas."
          action={
            <Link href="/login" className="text-sm font-medium text-[var(--df-brand-600)] hover:underline">
              Ir para o login
            </Link>
          }
        />
      </div>
    );
  }

  const queues = await listOperationalQueuesWithMetrics(snap.tenantId);
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-slate-100 bg-white px-6 py-12 text-center text-sm text-slate-500">
          A carregar filas…
        </div>
      }
    >
      <QueuesClient initialQueues={queues} />
    </Suspense>
  );
}
