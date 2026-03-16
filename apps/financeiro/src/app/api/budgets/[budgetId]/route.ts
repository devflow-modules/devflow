import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { budgetUpdateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { updateBudget, deleteBudget } from "@/modules/financeiro/services/budgets";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;
  const { budgetId } = await params;
  try {
    const payload = await request.json();
    const parsed = budgetUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return sendError(parsed.error.message, 400, parsed.error.format());
    }
    if (parsed.data.monthlyLimit === undefined) {
      return sendError("monthlyLimit é obrigatório", 400);
    }
    const updated = await updateBudget(prisma, budgetId, auth.context.householdId, parsed.data.monthlyLimit);
    if (!updated) return sendError("Orçamento não encontrado", 404);
    return sendSuccess(updated);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível atualizar o orçamento", 500, error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  const sameOrigin = assertSameOrigin(_request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(_request);
  if (!auth.ok) return auth.response;
  const { budgetId } = await params;
  try {
    const deleted = await deleteBudget(prisma, budgetId, auth.context.householdId);
    if (!deleted) return sendError("Orçamento não encontrado", 404);
    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover o orçamento", 500, error);
  }
}
