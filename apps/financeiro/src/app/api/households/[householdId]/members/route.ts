import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { listMembers } from "@/modules/financeiro/services/households/listMembers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const { householdId } = await params;
    if (householdId !== auth.context.householdId) {
      return sendError("Troque para esta casa antes de gerenciar membros", 403, undefined, "HOUSEHOLD_MISMATCH");
    }
    const { members } = await listMembers(prisma, householdId, auth.context.userId);
    return sendSuccess({
      householdId,
      members,
      canManageMembers: auth.context.membershipRole === "OWNER",
    });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível carregar membros", 500, error);
  }
}
