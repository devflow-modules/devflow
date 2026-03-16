import { NextRequest } from "next/server";
import { prisma } from "@/modules/financeiro/adapters/prisma/prismaFinanceiro";
import { sendError, sendSuccess } from "@/modules/financeiro/lib/api-response";
import { personalAllocationGoalUpdateSchema } from "@/modules/financeiro/schemas";
import { requireHouseholdMembership } from "@/app/api/_helpers/auth";
import { assertSameOrigin } from "@/app/api/_helpers/sameOrigin";
import { updatePersonalAllocationGoal } from "@/modules/financeiro/services/allocation-goals/updatePersonalAllocationGoal";
import { deletePersonalAllocationGoal } from "@/modules/financeiro/services/allocation-goals/deletePersonalAllocationGoal";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const { goalId } = await params;
    const payload = await request.json();
    const parseResult = personalAllocationGoalUpdateSchema.safeParse(payload);
    if (!parseResult.success) {
      return sendError(parseResult.error.message, 400, parseResult.error.format());
    }
    const updated = await updatePersonalAllocationGoal(
      prisma,
      goalId,
      auth.context.userId,
      auth.context.householdId,
      parseResult.data
    );
    if (!updated) return sendError("Meta pessoal não encontrada", 404, undefined, "GOAL_NOT_FOUND");
    return sendSuccess(updated);
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível atualizar sua meta pessoal", 500, error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const sameOrigin = assertSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const auth = await requireHouseholdMembership(request);
  if (!auth.ok) return auth.response;

  try {
    const { goalId } = await params;
    const deleted = await deletePersonalAllocationGoal(
      prisma,
      goalId,
      auth.context.userId,
      auth.context.householdId
    );
    if (!deleted) return sendError("Meta pessoal não encontrada", 404, undefined, "GOAL_NOT_FOUND");
    return sendSuccess({ deleted: true });
  } catch (error) {
    console.error(error);
    return sendError("Não foi possível remover sua meta pessoal", 500, error);
  }
}
