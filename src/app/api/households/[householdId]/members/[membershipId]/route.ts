import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import {
  setActiveHouseholdCookie,
  deleteActiveHouseholdCookie,
} from "@/modules/financeiro/adapters/cookies/householdCookie";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { householdMemberRemoveSchema } from "@/modules/financeiro/schemas";
import { removeMember } from "@/modules/financeiro/services/households/removeMember";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string; membershipId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const { householdId, membershipId: rawMembershipId } = await params;
    if (householdId !== auth.context.householdId) {
      return sendError("Troque para esta casa antes de gerenciar membros", 403, undefined, "HOUSEHOLD_MISMATCH");
    }
    const parsed = householdMemberRemoveSchema.safeParse({ membershipId: rawMembershipId });
    if (!parsed.success) {
      return sendError(parsed.error.message, 400, parsed.error.format());
    }
    const { membershipId } = parsed.data;
    const result = await removeMember(prisma, householdId, membershipId, {
      userId: auth.context.userId,
      householdId: auth.context.householdId,
      membershipRole: auth.context.membershipRole,
    });
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError("Membro não encontrado", 404, undefined, "NOT_FOUND");
      if (result.code === "FORBIDDEN") return sendError("Apenas OWNER pode remover outros membros", 403, undefined, "FORBIDDEN");
      if (result.code === "OWNER_CANNOT_LEAVE") {
        return sendError("OWNER não pode sair da casa sem transferir a titularidade", 409, undefined, "OWNER_CANNOT_LEAVE");
      }
      return sendError("Não é possível remover o último OWNER da casa", 409, undefined, "LAST_OWNER");
    }
    const response = sendSuccess({
      removed: true,
      membershipId,
      isSelf: result.isSelf,
      nextHouseholdId: result.nextHouseholdId,
    });
    if (result.isSelf) {
      if (result.nextHouseholdId) {
        setActiveHouseholdCookie(response, result.nextHouseholdId);
      } else {
        deleteActiveHouseholdCookie(response);
      }
    }
    return response;
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover membro", 500, error);
  }
}
