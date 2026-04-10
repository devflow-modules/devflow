import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { requeuePendingFollowUpTasksForTenant } from "@/modules/operations/reprocessFollowUpTasks";
import { auditOperationalAction } from "@/modules/operations/recordOperationalAudit";

export const dynamic = "force-dynamic";

/**
 * Reencaminha tarefas pendentes do tenant para a próxima janela do worker.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const tenantId = auth!.payload.tenantId;
  const userId = auth!.payload.sub;
  if (!tenantId) {
    return NextResponse.json({ success: false, error: "Tenant não identificado" }, { status: 400 });
  }

  auditOperationalAction("operational_reprocess_followups", tenantId, userId, {});

  const { updated } = await requeuePendingFollowUpTasksForTenant(tenantId);

  return NextResponse.json({
    success: true,
    data: { tasksRequeued: updated },
  });
}
