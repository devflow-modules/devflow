import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { cashFlowProjectionQuerySchema } from "@/modules/financeiro/schemas";
import { getCashFlowProjection } from "@/modules/financeiro/services/dashboard/getCashFlowProjection";
import { dateInputToDate } from "@/lib/dates";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = cashFlowProjectionQuerySchema.safeParse(rawQuery);
    if (!query.success) {
      return sendError(query.error.message, 400, query.error.format());
    }

    const fromParam = query.data.from ? dateInputToDate(query.data.from) : undefined;
    const toParam = query.data.to ? dateInputToDate(query.data.to) : undefined;
    if (toParam && fromParam && toParam.getTime() <= fromParam.getTime()) {
      return sendError("Intervalo inválido", 400, undefined, "INVALID_RANGE");
    }

    const horizonMonths = query.data.horizonMonths ?? null;
    const horizonDays =
      query.data.horizonDays ?? (horizonMonths ? horizonMonths * 30 : 30);

    const result = await getCashFlowProjection(prisma, {
      householdId: auth.context.householdId,
      from: fromParam,
      to: toParam,
      horizonDays,
      horizonMonths: horizonMonths ?? undefined,
      avgMonths: query.data.avgMonths,
      scenario: query.data.scenario,
    });

    return sendSuccess(result);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível calcular a projeção", 500, error);
  }
}
