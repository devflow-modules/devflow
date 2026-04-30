import Link from "next/link";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { getTenantSnapshot } from "@/lib/tenant-session";
import { listOperationalAgents } from "@/modules/inbox/operationsAgentsService";
import { validateAuthToken } from "@/modules/auth";
import { PageHeader } from "@/components/ui/page-header";
import { StateEmpty } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import { canViewTeamPage } from "@/lib/permissions";
import { AgentsClient } from "./AgentsClient";

export default async function AgentsPage() {
  const snap = await getTenantSnapshot();
  if (!snap.authenticated) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Operação"
          title="Equipe e agentes"
          description="Veja quem atende, em que estado está na Inbox e em que filas participa — após iniciar sessão."
          showDivider
        />
        <StateEmpty
          title="Inicie sessão"
          description="Inicie sessão com a conta da sua organização para ver a equipa e estados operacionais."
          nextStep="Se ainda não tem credenciais, peça a um admin da conta."
          action={
            <Link href="/login" className="text-sm font-medium text-[var(--df-brand-600)] hover:underline">
              Ir para o login
            </Link>
          }
        />
      </div>
    );
  }

  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;

  const viewer = auth
    ? {
        userId: auth.payload.sub,
        name: auth.payload.name,
        email: auth.payload.email,
        role: auth.payload.role,
      }
    : null;

  if (!canViewTeamPage(viewer?.role)) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Operação"
          title="Acesso restrito"
          description="Esta área exige permissão de gestor ou administrador da plataforma."
          showDivider
        />
        <StateEmpty
          title="Sem permissão para Equipe"
          description="Pode continuar o atendimento pela Inbox."
          action={
            <Link href="/inbox" className={buttonClassName("primary")}>
              Voltar para Inbox
            </Link>
          }
        />
      </div>
    );
  }

  const agents = await listOperationalAgents(snap.tenantId);
  return <AgentsClient agents={agents} viewer={viewer} />;
}
