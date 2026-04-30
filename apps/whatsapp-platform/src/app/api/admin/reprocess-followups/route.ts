import { NextRequest } from "next/server";
import { requeuePendingFollowUpTasksForTenant } from "@/modules/operations/reprocessFollowUpTasks";
import { auditOperationalAction } from "@/modules/operations/recordOperationalAudit";
import { gatePlatformAdminJwt } from "@/lib/adminApiAuth";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * Reencaminha tarefas pendentes do tenant para a próxima janela do worker.
 * Exclusivo `platform_admin`.
 */
export async function POST(request: NextRequest) {
  const traceId = newTraceId();
  const gate = await gatePlatformAdminJwt(request);
  if (!gate.ok) return gate.response;

  const tenantId = gate.auth.payload.tenantId;
  const userId = gate.auth.payload.sub;
  if (!tenantId) {
    return jsonError("BAD_REQUEST", "Tenant não identificado", 400, { traceId });
  }

  auditOperationalAction("operational_reprocess_followups", tenantId, userId, {});

  const { updated } = await requeuePendingFollowUpTasksForTenant(tenantId);

  return jsonSuccess({ tasksRequeued: updated }, { traceId });
}
