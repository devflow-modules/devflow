import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { activeHouseholdSetSchema } from "@/modules/financeiro/schemas";
import { requireSessionOnly } from "@/app/api/_helpers/auth";
import {
  getActiveHouseholdFromRequest,
  setActiveHouseholdCookie,
} from "@/modules/financeiro/adapters/cookies/householdCookie";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { setActiveHousehold } from "@/modules/financeiro/services/households/setActiveHousehold";

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireSessionOnly(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = activeHouseholdSetSchema.safeParse(body);
    if (!parsed.success) {
      return sendError(parsed.error.message, 400, parsed.error.format());
    }
    const { householdId } = parsed.data;
    const previousHouseholdId = getActiveHouseholdFromRequest(request) ?? null;
    const result = await setActiveHousehold(prisma, auth.userId, householdId, previousHouseholdId);
    if (!result.ok) {
      return sendError("Acesso negado a esta casa", 403);
    }
    const response = sendSuccess({ activeHouseholdId: householdId });
    setActiveHouseholdCookie(response, householdId);
    return response;
  } catch (error) {
    console.error(error);
    return sendError("Erro ao definir casa ativa", 500, error);
  }
}
