import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { getDashboardSummary } from "@/modules/financeiro/services/dashboard/getDashboardSummary";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const monthsParam = request.nextUrl.searchParams.get("months");
    const months = monthsParam ? Math.max(1, Math.min(24, Number(monthsParam))) : undefined;

    const { series } = await getDashboardSummary(prisma, {
      householdId: auth.context.householdId,
      months,
    });

    return sendSuccess({ series });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível carregar o resumo do dashboard", 500, error);
  }
}
