import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { guardFinancialMutation, logFinanceEvent } from "@/app/api/_helpers/financialMutation";
import { finalizeSettlementAfterReopen, listSettlements } from "@/modules/financeiro/services/accounts";

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
    const st = await prisma.settlement.findFirst({
      where: { id },
      select: { accountId: true },
    });
    if (!st) return sendError("Liquidação não encontrada", 404);

    const r = await finalizeSettlementAfterReopen(prisma, id, householdId);
    if (!r.ok) {
      if (r.code === "NOT_FOUND") return sendError("Liquidação não encontrada", 404);
      return sendError("Liquidação não está reaberta para finalizar", 400);
    }
    const list = await listSettlements(prisma, st.accountId, householdId);
    const settlement = list.find((x) => x.id === id);
    logFinanceEvent({
      action: "settlement_finalized",
      userId,
      householdId,
      settlementId: id,
    });
    return sendSuccess(settlement ?? { finalized: true });
  } catch (error) {
    console.error(error);
    return sendError("Erro ao finalizar", 500, error);
  }
}
