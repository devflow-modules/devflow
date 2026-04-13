import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { listRecentInboxThreadsForTenant } from "@/modules/inbox/waInboxOpsMetrics";

/**
 * Lista conversas do dashboard para o tenant da sessão (Prisma / wa_inbox_threads).
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  try {
    const tenantId = auth!.payload.tenantId;
    const threads = await listRecentInboxThreadsForTenant(tenantId, 50);
    const conversations = threads.map((t) => ({
      id: t.id,
      wa_from: t.phoneNumber,
      status: t.status,
      last_message_at: t.lastMessageAt.toISOString(),
      created_at: t.createdAt.toISOString(),
      updated_at: t.updatedAt.toISOString(),
    }));
    return NextResponse.json({ conversations, total: conversations.length });
  } catch (err) {
    console.error("[Dashboard conversations]", err);
    return NextResponse.json({ conversations: [], total: 0 }, { status: 500 });
  }
}
