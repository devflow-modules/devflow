import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { revokeInvite } from "@/modules/financeiro/services/invites/revokeInvite";

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
    const result = await revokeInvite(prisma, inviteId, {
      userId: auth.context.userId,
      householdId: auth.context.householdId,
    });
    if (!result.ok) {
      if (result.code === "INVITE_NOT_FOUND") return sendError("Convite não encontrado", 404, undefined, "INVITE_NOT_FOUND");
      return sendError("Convite já foi aceito", 409, undefined, "INVITE_ALREADY_ACCEPTED");
    }
    return sendSuccess({ revoked: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível revogar o convite", 500, error);
  }
}
