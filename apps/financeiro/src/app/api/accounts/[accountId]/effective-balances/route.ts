import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { getEffectiveBalances } from "@/modules/financeiro/services/accounts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;
  const { accountId } = await params;

  try {
    const balances = await getEffectiveBalances(prisma, accountId, householdId);
    return sendSuccess(balances);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível calcular os saldos efetivos", 500, error);
  }
}
