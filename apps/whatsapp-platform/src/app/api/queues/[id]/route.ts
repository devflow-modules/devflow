import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS, ROLES_OPERATIONAL } from "@/modules/auth";
import {
  deleteOperationalQueue,
  getOperationalQueue,
  updateOperationalQueue,
} from "@/modules/inbox/inboxOperationalQueueService";
import { requireFeatureOr403 } from "@/modules/billing/featureGate";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(64).optional(),
  description: z.string().max(2000).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  slaTargetMinutes: z.number().int().min(1).max(10080).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_OPERATIONAL, request);
  if (denied) return denied;

  const { id } = await params;
  const queue = await getOperationalQueue(auth!.payload.tenantId, id);
  if (!queue) {
    return NextResponse.json({ error: "Fila não encontrada" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: { queue } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const blocked = await requireFeatureOr403(auth!.payload.tenantId, "QUEUES_TAGS", auth!.payload);
  if (blocked) return blocked;

  const { id } = await params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  try {
    const queue = await updateOperationalQueue(auth!.payload.tenantId, id, parsed.data);
    if (!queue) {
      return NextResponse.json({ error: "Fila não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { queue } });
  } catch (e) {
    console.error("[api/queues/[id] PATCH]", e);
    return NextResponse.json({ error: "Falha ao atualizar fila" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const blocked = await requireFeatureOr403(auth!.payload.tenantId, "QUEUES_TAGS", auth!.payload);
  if (blocked) return blocked;

  const { id } = await params;
  try {
    const ok = await deleteOperationalQueue(auth!.payload.tenantId, id);
    if (!ok) {
      return NextResponse.json({ error: "Fila não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/queues/[id] DELETE]", e);
    return NextResponse.json({ error: "Falha ao remover fila" }, { status: 500 });
  }
}
