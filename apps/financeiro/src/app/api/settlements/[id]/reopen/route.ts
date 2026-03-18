import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { guardFinancialMutation, logFinanceEvent } from "@/app/api/_helpers/financialMutation";
import { reopenSettlement } from "@/modules/financeiro/services/accounts";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const rl = guardFinancialMutation(auth.context.userId);
  if (rl) return rl;
  const { householdId, userId } = auth.context;
  const { id } = await params;

  try {
    const r = await reopenSettlement(prisma, id, householdId);
    if (!r.ok) {
      if (r.code === "NOT_FOUND") return sendError("Liquidação não encontrada", 404);
      return sendError("Só é possível reabrir liquidações concluídas", 400, undefined, "NOT_COMPLETED");
    }
    logFinanceEvent({
      action: "settlement_reopened",
      userId,
      householdId,
      settlementId: id,
    });
    return sendSuccess({ reopened: true });
  } catch (error) {
    console.error(error);
    return sendError("Erro ao reabrir", 500, error);
  }
}
