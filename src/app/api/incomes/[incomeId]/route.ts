import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { incomeUpdateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { updateIncome, deleteIncome } from "@/modules/financeiro/services/incomes";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ incomeId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId, userId } = auth.context;

  try {
    const { incomeId } = await params;
    const payload = await request.json();
    const parseResult = incomeUpdateSchema.safeParse(payload);

    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const updated = await updateIncome(
      prisma,
      incomeId,
      householdId,
      parseResult.data,
      { userId, householdId }
    );

    if (!updated) return sendError("Receita não encontrada", 404);
    return sendSuccess(updated);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível atualizar a receita", 500, error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ incomeId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId, userId } = auth.context;

  try {
    const { incomeId } = await params;
    const deleted = await deleteIncome(prisma, incomeId, householdId, {
      userId,
      householdId,
    });

    if (!deleted) return sendError("Receita não encontrada", 404);
    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover a receita", 500, error);
  }
}
