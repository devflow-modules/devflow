import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { guardFinancialMutation, logFinanceEvent } from "@/app/api/_helpers/financialMutation";
import { completeSettlement } from "@/modules/financeiro/services/accounts";

export async function PATCH(
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
    const settlement = await completeSettlement(prisma, id, householdId);
    if (!settlement) return sendError("Liquidação não encontrada ou já concluída", 404, undefined, "SETTLEMENT_COMPLETE_INVALID");
    logFinanceEvent({
      action: "settlement_completed",
      userId,
      householdId,
      settlementId: id,
      amount: settlement.paidAmount,
    });
    return sendSuccess(settlement);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível marcar como pago", 500, error);
  }
}
