import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { calculateMonthlySummary } from "@/modules/financeiro/services/accounts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;
  const { accountId } = await params;
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const y = year ? parseInt(year, 10) : new Date().getFullYear();
  const m = month ? parseInt(month, 10) : new Date().getMonth() + 1;
  if (Number.isNaN(y) || Number.isNaN(m) || m < 1 || m > 12) {
    return sendError("Parâmetros year e month inválidos", 400);
  }

  try {
    const summary = await calculateMonthlySummary(
      prisma,
      accountId,
      householdId,
      y,
      m
    );
    if (!summary) return sendError("Conta não encontrada", 404);
    return sendSuccess(summary);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível calcular o resumo mensal", 500, error);
  }
}
