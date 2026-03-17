import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getQueueById, updateQueue, deleteQueue } from "@/modules/queues";

function requireAdmin(auth: { payload: { role: string } }): NextResponse | null {
  if (auth.payload.role !== "admin") {
    return NextResponse.json({ error: "Apenas admin pode editar ou remover filas" }, { status: 403 });
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
  let body: { name?: string; slug?: string; max_size?: number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const existing = await getQueueById(id);
  if (!existing) {
    return NextResponse.json({ error: "Fila não encontrada" }, { status: 404 });
  }
  if ((existing as { tenant_id: string }).tenant_id !== auth.payload.tenantId) {
    return NextResponse.json({ error: "Acesso negado ao tenant" }, { status: 403 });
  }
  try {
    const queue = await updateQueue(id, {
      name: body.name,
      max_size: body.max_size ?? undefined,
    });
    return NextResponse.json(queue);
  } catch (e) {
    console.error("[api/queues/[id]]", e);
    return NextResponse.json({ error: "Falha ao atualizar fila" }, { status: 500 });
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
  const existing = await getQueueById(id);
  if (!existing) {
    return NextResponse.json({ error: "Fila não encontrada" }, { status: 404 });
  }
  if ((existing as { tenant_id: string }).tenant_id !== auth.payload.tenantId) {
    return NextResponse.json({ error: "Acesso negado ao tenant" }, { status: 403 });
  }
  try {
    await deleteQueue(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/queues/[id]]", e);
    return NextResponse.json({ error: "Falha ao remover fila" }, { status: 500 });
  }
}
