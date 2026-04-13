import { NextRequest } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_OPERATIONAL } from "@/modules/auth";
import { listOperationalAgents } from "@/modules/inbox/operationsAgentsService";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** Equipa operacional com estado em `whatsapp_agent_status` (livre/ocupado/offline). */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_OPERATIONAL, request);
  if (denied) return denied;

  try {
    const members = await listOperationalAgents(auth!.payload.tenantId);
    return jsonSuccess({ members });
  } catch (e) {
    console.error("[api/inbox/team GET]", e);
    return jsonError("team_failed", "Não foi possível carregar a equipa.", 500);
  }
}
