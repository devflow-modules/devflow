import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { incomeAllocationGoalUpdateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { updateIncomeAllocationGoal } from "@/modules/financeiro/services/allocation-goals/updateIncomeAllocationGoal";
import { deleteIncomeAllocationGoal } from "@/modules/financeiro/services/allocation-goals/deleteIncomeAllocationGoal";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ goalId: string }> }) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  if (auth.context.membershipRole !== "OWNER") {
    return sendError("Apenas OWNER pode editar metas", 403, undefined, "OWNER_REQUIRED");
  }

  try {
    const { goalId } = await params;
    const payload = await request.json();
    const parseResult = incomeAllocationGoalUpdateSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }
    const updated = await updateIncomeAllocationGoal(prisma, goalId, auth.context.householdId, parseResult.data, {
      userId: auth.context.userId,
      householdId: auth.context.householdId,
    });
    if (!updated) return sendError("Meta não encontrada", 404, undefined, "GOAL_NOT_FOUND");
    return sendSuccess(updated);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível atualizar a meta", 500, error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ goalId: string }> }) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  if (auth.context.membershipRole !== "OWNER") {
    return sendError("Apenas OWNER pode remover metas", 403, undefined, "OWNER_REQUIRED");
  }

  try {
    const { goalId } = await params;
    const deleted = await deleteIncomeAllocationGoal(prisma, goalId, auth.context.householdId, {
      userId: auth.context.userId,
      householdId: auth.context.householdId,
    });
    if (!deleted) return sendError("Meta não encontrada", 404, undefined, "GOAL_NOT_FOUND");
    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover a meta", 500, error);
  }
}
