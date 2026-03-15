import { NextRequest } from "next/server";
import { BillingService } from "@/modules/billing";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { householdCreateSchema } from "@/modules/financeiro/schemas";
import { requireSessionOnly } from "@/app/api/_helpers/auth";
import { setActiveHouseholdCookie } from "@/modules/financeiro/adapters/cookies/householdCookie";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { createHousehold } from "@/modules/financeiro/services/households/createHousehold";

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireSessionOnly(request);
  if (!auth.ok) return auth.response;

  try {
    const payload = await request.json();
    const parseResult = householdCreateSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }
    // BILLING_SOFT_CHECK: limite de casas por plano (removível)
    const householdCount = await prisma.householdMembership.count({
      where: { userId: auth.userId },
    });
    if (!(await BillingService.checkLimit(auth.userId, "households", householdCount))) {
      return sendError(
        "Limite de casas do seu plano atingido. Faça upgrade para criar mais.",
        402,
        { code: "HOUSEHOLD_LIMIT_REACHED" },
        "HOUSEHOLD_LIMIT_REACHED"
      );
    }
    const result = await createHousehold(prisma, parseResult.data, {
      userId: auth.userId,
      email: auth.email,
    });
    if (!result.ok) {
      return sendError(
        "Já existe uma casa com este identificador (slug). Tente outro (ex.: casa-marques-2).",
        409,
        { slug: result.slug },
        "SLUG_ALREADY_EXISTS"
      );
    }
    const response = sendSuccess(
      { id: result.household.id, name: result.household.name, slug: result.household.slug },
      201,
      "Casa criada"
    );
    setActiveHouseholdCookie(response, result.household.id);
    return response;
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar a casa", 500, error);
  }
}
