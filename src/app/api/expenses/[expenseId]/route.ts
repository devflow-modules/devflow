import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { expenseUpdateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { updateExpense, deleteExpense } from "@/modules/financeiro/services/expenses";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId, userId } = auth.context;

  try {
    const { expenseId } = await params;
    const payload = await request.json();
    const parseResult = expenseUpdateSchema.safeParse(payload);

    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }

    const hasPaidFields =
      parseResult.data.paidAt !== undefined || parseResult.data.paidAmount !== undefined;
    if (hasPaidFields && parseResult.data.status !== "PAID") {
      return sendError(
        "paidAt/paidAmount exigem status=PAID",
        400,
        { status: parseResult.data.status ?? null },
        "PAID_FIELDS_REQUIRE_PAID_STATUS"
      );
    }

    const updated = await updateExpense(
      prisma,
      expenseId,
      householdId,
      parseResult.data,
      { userId, householdId }
    );

    if (!updated) return sendError("Despesa não encontrada", 404);
    return sendSuccess(updated);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível atualizar a despesa", 500, error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { householdId, userId } = auth.context;

  try {
    const { expenseId } = await params;
    const deleted = await deleteExpense(prisma, expenseId, householdId, {
      userId,
      householdId,
    });

    if (!deleted) return sendError("Despesa não encontrada", 404);
    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover a despesa", 500, error);
  }
}
