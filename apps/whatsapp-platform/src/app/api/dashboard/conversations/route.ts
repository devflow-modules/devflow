import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { listConversations } from "@/modules/conversations";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";

/**
 * Lista conversas do dashboard para o tenant da sessão.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ conversations: [], total: 0 });
  }
  try {
    const tenantId = auth!.payload.tenantId;
    const conversations = await listConversations(tenantId, 50);
    return NextResponse.json({ conversations, total: conversations.length });
  } catch (err) {
    console.error("[Dashboard conversations]", err);
    return NextResponse.json({ conversations: [], total: 0 }, { status: 500 });
  }
}
