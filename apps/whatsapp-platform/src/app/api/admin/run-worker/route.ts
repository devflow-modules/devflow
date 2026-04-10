import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { processFollowUps } from "@/modules/commercial";
import { auditOperationalAction } from "@/modules/operations/recordOperationalAudit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(25),
});

/**
 * Executa uma passagem imediata do worker de follow-ups (limite seguro).
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

  let json: unknown = {};
  try {
    const t = await request.text();
    if (t.trim()) json = JSON.parse(t);
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Parâmetros inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  auditOperationalAction("operational_worker_manual_run", tenantId, userId, {
    limit: parsed.data.limit,
  });

  const result = await processFollowUps({ limit: parsed.data.limit, tenantId });

  return NextResponse.json({ success: true, data: result });
}
