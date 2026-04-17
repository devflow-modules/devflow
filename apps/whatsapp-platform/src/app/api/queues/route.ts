import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS, ROLES_OPERATIONAL } from "@/modules/auth";
import {
  createOperationalQueue,
  listOperationalQueuesWithMetrics,
} from "@/modules/inbox/inboxOperationalQueueService";
import { requireFeatureOr403 } from "@/modules/billing/featureGate";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(64).optional(),
  description: z.string().max(2000).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  slaTargetMinutes: z.number().int().min(1).max(10080).nullable().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET: filas canónicas + métricas (auth).
 * Legado: `?tenant_id=` sem cookie — deprecado; usar sessão.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_OPERATIONAL, request);
  if (denied) return denied;

  try {
    const queues = await listOperationalQueuesWithMetrics(auth!.payload.tenantId);
    return NextResponse.json({ success: true, data: { queues } });
  } catch (e) {
    console.error("[api/queues GET]", e);
    return NextResponse.json({ error: "Falha ao listar filas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const blocked = await requireFeatureOr403(auth!.payload.tenantId, "QUEUES_TAGS", auth!.payload);
  if (blocked) return blocked;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const queue = await createOperationalQueue(auth!.payload.tenantId, parsed.data);
    return NextResponse.json({ success: true, data: { queue } });
  } catch (e) {
    console.error("[api/queues POST]", e);
    return NextResponse.json({ error: "Falha ao criar fila" }, { status: 500 });
  }
}
