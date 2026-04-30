import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import {
  getOrCreateTenantOperationalConfig,
  updateTenantOperationalConfig,
} from "@/modules/operations/tenantOperationalConfigService";
import { auditOperationalAction } from "@/modules/operations/recordOperationalAudit";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  aiEnabled: z.boolean().optional(),
  automationEnabled: z.boolean().optional(),
});

/** PATCH — controlos operacionais do tenant (manager+, não é área DevFlow `/api/admin`). */
export async function PATCH(request: NextRequest) {
  const traceId = newTraceId();
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const tenantId = auth!.payload.tenantId;
  const userId = auth!.payload.sub;
  if (!tenantId) {
    return jsonError("BAD_REQUEST", "Tenant não identificado", 400, { traceId });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido", 400, { traceId });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Dados inválidos", 400, { traceId });
  }

  if (parsed.data.aiEnabled === undefined && parsed.data.automationEnabled === undefined) {
    return jsonError("VALIDATION_ERROR", "Envie aiEnabled e/ou automationEnabled", 400, { traceId });
  }

  const before = await getOrCreateTenantOperationalConfig(tenantId);
  const row = await updateTenantOperationalConfig(tenantId, parsed.data, userId);

  if (parsed.data.aiEnabled !== undefined && parsed.data.aiEnabled !== before.aiEnabled) {
    auditOperationalAction(
      parsed.data.aiEnabled ? "operational_ai_resumed" : "operational_ai_paused",
      tenantId,
      userId,
      { before: before.aiEnabled, after: row.aiEnabled }
    );
  }
  if (
    parsed.data.automationEnabled !== undefined &&
    parsed.data.automationEnabled !== before.automationEnabled
  ) {
    auditOperationalAction(
      parsed.data.automationEnabled ? "operational_automation_resumed" : "operational_automation_paused",
      tenantId,
      userId,
      { before: before.automationEnabled, after: row.automationEnabled }
    );
  }

  return jsonSuccess(
    {
      aiEnabled: row.aiEnabled,
      automationEnabled: row.automationEnabled,
      updatedAt: row.updatedAt.toISOString(),
    },
    { traceId }
  );
}
