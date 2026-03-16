import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { getDashboardOverview } from "@/modules/financeiro/services/dashboard/getDashboardOverview";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  try {
    const overview = await getDashboardOverview(prisma, auth.context.householdId);
    return sendSuccess(overview);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível carregar o resumo do dashboard", 500, error);
  }
}
