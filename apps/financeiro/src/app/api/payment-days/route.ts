import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { paymentDaySchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { listPaymentDays } from "@/modules/financeiro/services/payment-days/listPaymentDays";
import { createPaymentDay } from "@/modules/financeiro/services/payment-days/createPaymentDay";

export async function GET(request: NextRequest) {
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const days = await listPaymentDays(prisma, householdId);
    return sendSuccess(days);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível listar os dias de recebimento", 500, error);
  }
}

export async function POST(request: NextRequest) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const payload = await request.json();
    const parseResult = paymentDaySchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }
    const result = await createPaymentDay(prisma, householdId, parseResult.data);
    if ("error" in result) {
      if (result.error === "SOURCE_NOT_FOUND") return sendError("Fonte não encontrada ou não pertence à sua casa", 404);
      return sendError("Ciclo não encontrado ou não pertence à sua casa", 404);
    }
    return sendSuccess(result.data, 201);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível criar o dia de recebimento", 500, error);
  }
}
