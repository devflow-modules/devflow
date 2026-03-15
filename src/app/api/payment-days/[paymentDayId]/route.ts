import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { paymentDayUpdateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { updatePaymentDay } from "@/modules/financeiro/services/payment-days/updatePaymentDay";
import { deletePaymentDay } from "@/modules/financeiro/services/payment-days/deletePaymentDay";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ paymentDayId: string }> }) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const { paymentDayId } = await params;
    const payload = await request.json();
    const parseResult = paymentDayUpdateSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }
    const result = await updatePaymentDay(prisma, paymentDayId, householdId, parseResult.data);
    if ("error" in result) {
      if (result.error === "CYCLE_NOT_FOUND") return sendError("Ciclo não encontrado ou não pertence à sua casa", 404);
      return sendError("Dia de recebimento não encontrado", 404);
    }
    return sendSuccess(result.data);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível atualizar o dia", 500, error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ paymentDayId: string }> }) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId } = auth.context;

  try {
    const { paymentDayId } = await params;
    const deleted = await deletePaymentDay(prisma, paymentDayId, householdId);
    if (!deleted) return sendError("Dia de recebimento não encontrado", 404);
    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover o dia", 500, error);
  }
}
