import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { updateConversationStatus } from "@/modules/conversations";

/**
 * PATCH /api/admin/conversations/[id]/resolve
 * Marca conversa como resolved, libera agente (status = available) e opcionalmente
 * atualiza completed_at no Supabase.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: conversationId } = await params;
  const tenantId = auth.payload.tenantId;

  const agentStatuses = await prisma.agentStatus.findMany({
    where: { tenantId, currentConversationId: conversationId },
  });

  for (const as_ of agentStatuses) {
    await prisma.agentStatus.update({
      where: { id: as_.id },
      data: { status: "available", currentConversationId: null, updatedAt: new Date() },
    });
  }

  if (hasSupabaseConfig()) {
    try {
      await updateConversationStatus(conversationId, "resolved");
    } catch (e) {
      console.error("[resolve] Supabase updateConversationStatus:", e);
    }
  }

  return NextResponse.json({ success: true, resolved: true });
}
