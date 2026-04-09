import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, requireRole, STAFF_ROLES } from "@/modules/auth";
import { attemptRepairClaimFromOutboundEvidence } from "@/modules/messaging/automaticReplyClaimReconciliationService";

export const dynamic = "force-dynamic";

/**
 * Tenta repair de um claim (evidência de outbound automático na janela do turno).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    const denied = requireRole(auth, STAFF_ROLES, request);
    if (denied) return denied;

    const tenantId = auth!.payload.tenantId;
    const { id: claimId } = await params;
    if (!claimId) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    }

    const existing = await prisma.waAutoReplyClaim.findFirst({
      where: { id: claimId, tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Claim not found" }, { status: 404 });
    }

    const result = await attemptRepairClaimFromOutboundEvidence(prisma, claimId);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[admin/auto-reply-claims/repair]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
