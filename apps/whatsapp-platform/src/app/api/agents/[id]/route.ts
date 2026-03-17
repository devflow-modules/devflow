import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getAgentById, updateAgent, deleteAgent } from "@/modules/agents";
import type { AgentStatus } from "@/lib/db/types";

function requireAdmin(auth: { payload: { role: string } }): NextResponse | null {
  if (auth.payload.role !== "admin") {
    return NextResponse.json({ error: "Apenas admin pode editar ou remover agentes" }, { status: 403 });
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const forbidden = requireAdmin(auth);
  if (forbidden) return forbidden;

  const { id } = await params;
  let body: { name?: string; email?: string | null; status?: AgentStatus };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const existing = await getAgentById(id);
  if (!existing) {
    return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  }
  if ((existing as { tenant_id: string }).tenant_id !== auth.payload.tenantId) {
    return NextResponse.json({ error: "Acesso negado ao tenant" }, { status: 403 });
  }
  try {
    const agent = await updateAgent(id, {
      name: body.name,
      email: body.email,
      status: body.status,
    });
    return NextResponse.json(agent);
  } catch (e) {
    console.error("[api/agents/[id]]", e);
    return NextResponse.json({ error: "Falha ao atualizar agente" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const forbidden = requireAdmin(auth);
  if (forbidden) return forbidden;

  const { id } = await params;
  const existing = await getAgentById(id);
  if (!existing) {
    return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  }
  if ((existing as { tenant_id: string }).tenant_id !== auth.payload.tenantId) {
    return NextResponse.json({ error: "Acesso negado ao tenant" }, { status: 403 });
  }
  try {
    await deleteAgent(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/agents/[id]]", e);
    return NextResponse.json({ error: "Falha ao remover agente" }, { status: 500 });
  }
}
