import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { getSystemHealthSnapshot } from "@/modules/dashboard/systemHealthService";
import { buildSystemHealthSummary } from "@/modules/dashboard/buildSystemHealthSummary";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const tenantId = auth!.payload.tenantId;
  if (!tenantId) {
    return NextResponse.json({ success: false, error: "Tenant não identificado" }, { status: 400 });
  }

  try {
    const snapshot = await getSystemHealthSnapshot(tenantId);
    const summary = buildSystemHealthSummary(snapshot);
    return NextResponse.json({ success: true, data: { snapshot, summary } });
  } catch (e) {
    console.error("[dashboard/system-health]", e);
    return NextResponse.json(
      { success: false, error: "Não foi possível carregar o estado do sistema." },
      { status: 503 }
    );
  }
}
