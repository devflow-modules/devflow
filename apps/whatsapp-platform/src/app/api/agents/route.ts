import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { listOperationalAgents } from "@/modules/inbox/operationsAgentsService";

export const dynamic = "force-dynamic";

/**
 * Agentes operacionais = utilizadores do tenant + `whatsapp_agent_status` + métricas Inbox.
 * Legado Supabase `agents` removido — usar apenas com sessão.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  try {
    const agents = await listOperationalAgents(auth!.payload.tenantId);
    return NextResponse.json({ success: true, data: { agents } });
  } catch (e) {
    console.error("[api/agents GET]", e);
    return NextResponse.json({ error: "Falha ao listar agentes" }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Os agentes operacionais são utilizadores do tenant. Crie utilizadores em Configurações; o estado de disponibilidade atualiza-se nesta página.",
    },
    { status: 410 }
  );
}
