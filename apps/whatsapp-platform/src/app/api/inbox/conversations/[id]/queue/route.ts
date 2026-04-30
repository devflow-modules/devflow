import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { setThreadQueue } from "@/modules/inbox/inboxOperationalQueueService";
import { requireFeatureOr403 } from "@/modules/billing/featureGate";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  queueId: z.union([z.string().cuid(), z.null()]),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const blocked = await requireFeatureOr403(auth!.payload.tenantId, "QUEUES_TAGS", auth!.payload);
  if (blocked) return blocked;

  const { id: threadId } = await context.params;
  if (!threadId?.trim()) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "queueId inválido" }, { status: 400 });
  }

  const ok = await setThreadQueue(auth!.payload.tenantId, threadId, parsed.data.queueId);
  if (!ok) {
    return NextResponse.json({ error: "Conversa ou fila inválida" }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: { threadId, queueId: parsed.data.queueId } });
}
