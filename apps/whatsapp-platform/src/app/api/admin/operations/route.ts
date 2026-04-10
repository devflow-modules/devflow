import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import {
  getOrCreateTenantOperationalConfig,
  updateTenantOperationalConfig,
} from "@/modules/operations/tenantOperationalConfigService";
import { auditOperationalAction } from "@/modules/operations/recordOperationalAudit";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  aiEnabled: z.boolean().optional(),
  automationEnabled: z.boolean().optional(),
});

/** PATCH — controlos operacionais do tenant (manager / platform_admin). */
export async function PATCH(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const tenantId = auth!.payload.tenantId;
  const userId = auth!.payload.sub;
  if (!tenantId) {
    return NextResponse.json({ success: false, error: "Tenant não identificado" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Corpo inválido" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.aiEnabled === undefined && parsed.data.automationEnabled === undefined) {
    return NextResponse.json(
      { success: false, error: "Envie aiEnabled e/ou automationEnabled" },
      { status: 400 }
    );
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

  return NextResponse.json({
    success: true,
    data: {
      aiEnabled: row.aiEnabled,
      automationEnabled: row.automationEnabled,
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}
