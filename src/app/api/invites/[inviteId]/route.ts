import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ inviteId: string }> }) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  if (auth.context.membershipRole !== "OWNER") {
    return sendError("Apenas OWNER pode revogar convites", 403, undefined, "OWNER_REQUIRED");
  }

  try {
    const { inviteId } = await params;

    const invite = await prisma.invite.findFirst({
      where: { id: inviteId, householdId: auth.context.householdId },
    });

    if (!invite) return sendError("Convite não encontrado", 404, undefined, "INVITE_NOT_FOUND");
    if (invite.acceptedAt) {
      return sendError("Convite já foi aceito", 409, undefined, "INVITE_ALREADY_ACCEPTED");
    }

    await prisma.invite.delete({ where: { id: inviteId } });

    await createAuditLog(prisma, {
      userId: auth.context.userId,
      householdId: auth.context.householdId,
      action: AUDIT_ACTIONS.INVITE_REVOKED,
      entityType: AUDIT_ENTITY.INVITE,
      entityId: invite.id,
      metadata: { email: invite.email, role: invite.role },
    });

    return sendSuccess({ revoked: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível revogar o convite", 500, error);
  }
}
