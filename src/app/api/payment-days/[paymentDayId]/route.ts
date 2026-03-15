import { NextRequest } from "next/server";
import { prisma } from "@/lib/financeiro/db";
import { sendError, sendSuccess } from "@/lib/financeiro/api-response";
import { paymentDayUpdateSchema } from "@/lib/financeiro/schema";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";

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

    const data = parseResult.data;
    if (data.cycleId != null && data.cycleId !== "") {
      const cycle = await prisma.cycle.findFirst({
        where: { id: data.cycleId, householdId },
      });
      if (!cycle) return sendError("Ciclo não encontrado ou não pertence à sua casa", 404);
    }

    const day = await prisma.paymentDay.updateMany({
      where: { id: paymentDayId, source: { householdId } },
      data,
    });

    if (day.count === 0) {
      return sendError("Dia de recebimento não encontrado", 404);
    }

    const updated = await prisma.paymentDay.findUnique({ where: { id: paymentDayId } });

    return sendSuccess(updated);
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

    const deleted = await prisma.paymentDay.deleteMany({
      where: { id: paymentDayId, source: { householdId } },
    });

    if (deleted.count === 0) {
      return sendError("Dia de recebimento não encontrado", 404);
    }

    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover o dia", 500, error);
  }
}
