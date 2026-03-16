import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { householdTransferOwnershipSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { transferOwnership } from "@/modules/financeiro/services/households/transferOwnership";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const { householdId } = await params;
    if (householdId !== auth.context.householdId) {
      return sendError("Troque para esta casa antes de gerenciar membros", 403, undefined, "HOUSEHOLD_MISMATCH");
    }
    if (auth.context.membershipRole !== "OWNER") {
      return sendError("Apenas OWNER pode transferir a titularidade", 403, undefined, "OWNER_REQUIRED");
    }
    const payload = await request.json();
    const parsed = householdTransferOwnershipSchema.safeParse(payload);
    if (!parsed.success) {
      return sendError(parsed.error.message, 400, parsed.error.format());
    }
    const { newOwnerMembershipId } = parsed.data;
    const result = await transferOwnership(prisma, householdId, newOwnerMembershipId, {
      userId: auth.context.userId,
      householdId: auth.context.householdId,
    });
    if (!result.ok) {
      if (result.code === "NOT_OWNER") return sendError("Você não é OWNER desta casa", 403, undefined, "NOT_OWNER");
      if (result.code === "NOT_FOUND") return sendError("Membro não encontrado nesta casa", 404, undefined, "NOT_FOUND");
      if (result.code === "SAME_USER") return sendError("Escolha outro membro para transferir a titularidade", 400, undefined, "SAME_USER");
      return sendError("O novo titular deve ser um MEMBER", 400, undefined, "TARGET_MUST_BE_MEMBER");
    }
    return sendSuccess(
      {
        householdId,
        fromUserId: result.fromUserId,
        toUserId: result.toUserId,
        fromMembershipId: result.fromMembershipId,
        toMembershipId: result.toMembershipId,
      },
      200,
      "Titularidade transferida"
    );
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível transferir a titularidade", 500, error);
  }
}
