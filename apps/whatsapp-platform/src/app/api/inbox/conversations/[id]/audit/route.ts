import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getThreadAuditLog } from "@/modules/inbox";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = auth.payload.tenantId;
  const { id: threadId } = await context.params;

  if (!threadId?.trim()) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10) || 50,
    200
  );

  const logs = await getThreadAuditLog(tenantId, threadId, { limit });

  return NextResponse.json({
    success: true,
    data: {
      logs: logs.map((l) => ({
        id: l.id,
        threadId: l.threadId,
        userId: l.userId,
        action: l.action,
        metadata: l.metadata,
        createdAt: l.createdAt.toISOString(),
        user: l.user,
      })),
    },
  });
}
